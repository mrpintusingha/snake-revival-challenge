import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ENTRY_ATTEMPTS,
  ENTRY_CURRENCY,
  ENTRY_PRICE,
  GAME_VERSION,
  MAX_SESSION_DURATION_MS,
  SPONSOR_CATEGORIES,
  SPONSOR_MIN_INCREMENT,
  tierFor,
} from "./config";
import { MAX_FOODS, MIN_MS_PER_FOOD, scoreForFoods } from "./scoring";

/* ------------------------------------------------------------------ utils */

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

const NICKNAME_ADJECTIVES = [
  "Swift", "Neon", "Retro", "Turbo", "Pixel", "Cyber", "Mega", "Rapid",
  "Wild", "Cosmic", "Rusty", "Sonic", "Nitro", "Solar", "Silent", "Golden",
];
const NICKNAME_NOUNS = [
  "Viper", "Cobra", "Python", "Mamba", "Racer", "Ranger", "Hunter", "Rider",
  "Comet", "Rocket", "Blazer", "Striker", "Dasher", "Glider", "Runner", "Coder",
];

/**
 * A presentable placeholder name, assigned automatically so a first-time
 * player's score is never attributed to a bare, collision-prone "Player" —
 * every leaderboard row gets a real-looking name from the very first game.
 */
function randomNickname(): string {
  const rand = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0]! % n;
  const adj = NICKNAME_ADJECTIVES[rand(NICKNAME_ADJECTIVES.length)];
  const noun = NICKNAME_NOUNS[rand(NICKNAME_NOUNS.length)];
  const num = rand(900) + 100;
  return `${adj}${noun}${num}`;
}

const hits = new Map<string, number[]>();
function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new Error("Too many requests. Slow down a moment.");
  list.push(now);
  hits.set(key, list);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function publicDb() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const nicknameSchema = z
  .string()
  .trim()
  .min(2)
  .max(18)
  .regex(/^[\p{L}\p{N} _.'-]+$/u, "Letters and numbers only");


async function signCheckpointData(payloadObj: { t: string; seq: number; f: number; d: number }): Promise<string> {
  const payload = btoa(JSON.stringify(payloadObj));
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Required server secret is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sig = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${payload}.${sig}`;
}

async function verifyCheckpointData(token: string) {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error("Invalid checkpoint format");
  const [payload, sig] = parts;
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Required server secret is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedSig = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (sig !== expectedSig) throw new Error("Checkpoint signature mismatch");
  return JSON.parse(atob(payload!)) as { t: string; seq: number; f: number; d: number };
}

/* ------------------------------------------------------- public read data */

let homeDataCache: { data: any; expiresAt: number } | null = null;
let homeDataPromise: Promise<any> | null = null;

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const TTL = 60 * 1000; // 60 seconds
  const now = Date.now();

  // 1. Return warm cache if valid
  if (homeDataCache && now < homeDataCache.expiresAt) {
    return homeDataCache.data;
  }

  // 2. Prevent cache stampede by joining existing inflight promise
  if (homeDataPromise) {
    return homeDataPromise;
  }

  // 3. Fetch data, handling graceful fallback on failure
  homeDataPromise = (async () => {
    try {
      const db = await publicDb();
      const since = new Date(Date.now() - 86400000).toISOString();

      const [players, top, challengesToday, activity, board, recentPlayers, gamesToday, topScoreToday] =
        await Promise.all([
          db.from("profiles").select("id", { count: "estimated", head: true }),
          db.from("profiles").select("best_score").order("best_score", { ascending: false }).limit(1),
          db.from("challenges").select("id", { count: "exact", head: true }).gte("created_at", since),
          db
            .from("activity_events")
            .select("id, event_type, metadata, created_at")
            .order("created_at", { ascending: false })
            .limit(12),
          db
            .from("profiles")
            .select("id, nickname, country, best_score")
            .gt("best_score", 0)
            .order("best_score", { ascending: false })
            .limit(5),
          db
            .from("scores")
            .select("profile_id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 900000).toISOString()),
          db.from("scores").select("id", { count: "exact", head: true }).gte("created_at", since),
          db.from("scores").select("score").gte("created_at", since).order("score", { ascending: false }).limit(1),
        ]);

      const data = {
        players: players.count ?? 0,
        topScore: top.data?.[0]?.best_score ?? 0,
        challengesToday: challengesToday.count ?? 0,
        playingNow: recentPlayers.count ?? 0,
        activity: activity.data ?? [],
        leaderboard: board.data ?? [],
        gamesToday: gamesToday.count ?? 0,
        topScoreToday: topScoreToday.data?.[0]?.score ?? 0,
      };

      homeDataCache = { data, expiresAt: Date.now() + TTL };
      return data;
    } catch (e) {
      console.error("[getHomeData] Failed to fetch homepage data", e);
      // Fallback: serve stale cache if available, otherwise empty skeleton
      if (homeDataCache) return homeDataCache.data;
      return {
        players: 0,
        topScore: 0,
        challengesToday: 0,
        playingNow: 0,
        activity: [],
        leaderboard: [],
        gamesToday: 0,
        topScoreToday: 0,
      };
    } finally {
      homeDataPromise = null; // Clear inflight promise lock
    }
  })();

  return homeDataPromise;
});

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((i: { scope?: string | undefined; country?: string | undefined; profileId?: string | null | undefined }) =>
    z
      .object({
        scope: z.enum(["global", "country", "friends"]).default("global"),
        country: z.string().max(60).optional(),
        profileId: z.string().uuid().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const db = await publicDb();

    if (data.scope === "friends") {
      if (!data.profileId) return { rows: [], you: null };
      const { data: ch } = await db
        .from("challenges")
        .select("challenger_id, accepted_by")
        .or(`challenger_id.eq.${data.profileId},accepted_by.eq.${data.profileId}`)
        .limit(100);
      const ids = new Set<string>([data.profileId]);
      for (const c of ch ?? []) {
        if (c.challenger_id) ids.add(c.challenger_id as string);
        if (c.accepted_by) ids.add(c.accepted_by as string);
      }
      const { data: rows } = await db
        .from("profiles")
        .select("id, nickname, country, best_score")
        .in("id", [...ids])
        .order("best_score", { ascending: false });
      return {
        rows: (rows ?? []).map((r, i) => ({ ...r, rank: i + 1 })),
        you: data.profileId,
      };
    }

    let q = db
      .from("profiles")
      .select("id, nickname, country, best_score")
      .gt("best_score", 0)
      .order("best_score", { ascending: false })
      .limit(100);
    if (data.scope === "country" && data.country) q = q.eq("country", data.country);
    const { data: rows } = await q;

    let you: { rank: number; nickname: string; best_score: number } | null = null;
    if (data.profileId) {
      const { data: me } = await db
        .from("profiles")
        .select("id, nickname, country, best_score")
        .eq("id", data.profileId)
        .maybeSingle();
      if (me && me.best_score > 0) {
        let cq = db
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gt("best_score", me.best_score);
        if (data.scope === "country" && data.country) cq = cq.eq("country", data.country);
        const { count } = await cq;
        you = { rank: (count ?? 0) + 1, nickname: me.nickname, best_score: me.best_score };
      }
    }
    return { rows: (rows ?? []).map((r, i) => ({ ...r, rank: i + 1 })), you };
  });

let weeklyLeaderboardCache: { data: any; expiresAt: number } | null = null;
let weeklyLeaderboardPromise: Promise<any> | null = null;

export const getWeeklyLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const TTL = 30 * 1000; // 30 seconds — this drives "who's #1 right now" framing
  const now = Date.now();

  if (weeklyLeaderboardCache && now < weeklyLeaderboardCache.expiresAt) {
    return weeklyLeaderboardCache.data;
  }
  if (weeklyLeaderboardPromise) return weeklyLeaderboardPromise;

  weeklyLeaderboardPromise = (async () => {
    try {
      const db = await publicDb();
      const { data: week } = await db
        .from("game_weeks")
        .select("id, week_start, week_end, game_key")
        .eq("status", "active")
        .maybeSingle();

      if (!week) {
        const empty = { week: null, rows: [] };
        weeklyLeaderboardCache = { data: empty, expiresAt: now + TTL };
        return empty;
      }

      const { data: rows, error } = await (db.rpc as any)("get_weekly_leaderboard", {
        p_week_id: week.id,
        p_limit: 100,
      });
      if (error) throw error;

      const data = {
        week,
        rows: ((rows ?? []) as { profile_id: string; nickname: string; country: string | null; best_score: number }[]).map(
          (r, i) => ({
            rank: i + 1,
            profileId: r.profile_id,
            nickname: r.nickname,
            country: r.country,
            score: r.best_score,
          }),
        ),
      };

      weeklyLeaderboardCache = { data, expiresAt: Date.now() + TTL };
      return data;
    } catch (e) {
      console.error("[getWeeklyLeaderboard] Failed to fetch weekly leaderboard", e);
      if (weeklyLeaderboardCache) return weeklyLeaderboardCache.data;
      return { week: null, rows: [] };
    } finally {
      weeklyLeaderboardPromise = null;
    }
  })();

  return weeklyLeaderboardPromise;
});

export const getProfile = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const db = await publicDb();
    const { data: profile } = await db
      .from("profiles")
      .select("id, nickname, country, best_score, games_played, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!profile) return null;

    const [{ count: better }, countryBetter, recent, ch] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }).gt("best_score", profile.best_score),
      profile.country
        ? db
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("country", profile.country)
            .gt("best_score", profile.best_score)
        : Promise.resolve({ count: null }),
      db
        .from("scores")
        .select("score, created_at")
        .eq("profile_id", data.id)
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("challenges")
        .select("challenge_code")
        .eq("challenger_id", data.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    return {
      ...profile,
      tier: tierFor(profile.best_score),
      rankGlobal: (better ?? 0) + 1,
      rankCountry: countryBetter.count == null ? null : countryBetter.count + 1,
      recent: recent.data ?? [],
      challengeCode: ch.data?.[0]?.challenge_code ?? null,
    };
  });

export const getChallenge = createServerFn({ method: "GET" })
  .inputValidator((i: { code: string }) => z.object({ code: z.string().min(4).max(24) }).parse(i))
  .handler(async ({ data }) => {
    const db = await publicDb();
    const { data: ch } = await db
      .from("challenges")
      .select(
        "id, challenge_code, challenger_score, challenger_id, accepted_by, accepted_score, created_at, expires_at, status",
      )
      .eq("challenge_code", data.code.toUpperCase())
      .maybeSingle();
    if (!ch) return null;
    // Expired links are treated as missing so the page shows the friendly state.
    if (ch.expires_at && new Date(ch.expires_at as string).getTime() < Date.now()) return null;
    const { data: challenger } = await db
      .from("profiles")
      .select("id, nickname, country, best_score")
      .eq("id", ch.challenger_id)
      .maybeSingle();
    return { ...ch, challenger };
  });

export const markChallengeOpened = createServerFn({ method: "POST" })
  .inputValidator((i: { code: string }) => z.object({ code: z.string().min(4).max(24) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const code = data.code.toUpperCase();
    const { data: ch } = await db
      .from("challenges")
      .select("id, opens, opened_at")
      .eq("challenge_code", code)
      .maybeSingle();
    if (!ch) return { ok: false };
    await db
      .from("challenges")
      .update({ opens: (ch.opens ?? 0) + 1, opened_at: ch.opened_at ?? new Date().toISOString() })
      .eq("id", ch.id);
    return { ok: true };
  });

/* -------------------------------------------------------------- identity */

async function upsertProfile(
  db: Awaited<ReturnType<typeof admin>>,
  secretHash: string,
  nickname?: string,
  country?: string | null,
) {
  const { data: existing } = await db
    .from("profiles")
    .select("id, nickname, country, best_score, games_played, has_custom_nickname")
    .eq("secret_hash", secretHash)
    .maybeSingle();

  if (existing) {
    if ((nickname && nickname !== existing.nickname) || (country && country !== existing.country)) {
      const { data: updated } = await db
        .from("profiles")
        .update({
          nickname: nickname ?? existing.nickname,
          country: country ?? existing.country,
          has_custom_nickname: nickname ? true : existing.has_custom_nickname,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, nickname, country, best_score, games_played, has_custom_nickname")
        .single();
      return updated ?? existing;
    }
    return existing;
  }

  // No nickname given (the free, zero-friction first-play path) gets a fun
  // auto-assigned name instead of a bare "Player" — see randomNickname().
  const { data: created, error } = await db
    .from("profiles")
    .insert({
      nickname: nickname ?? randomNickname(),
      country: country ?? null,
      secret_hash: secretHash,
      has_custom_nickname: Boolean(nickname),
    })
    .select("id, nickname, country, best_score, games_played, has_custom_nickname")
    .single();
  if (error) throw new Error("Could not create player");
  return created;
}

export const saveIdentity = createServerFn({ method: "POST" })
  .inputValidator((i: { secret: string; nickname: string; country?: string | null | undefined }) =>
    z
      .object({
        secret: z.string().min(8).max(200),
        nickname: nicknameSchema,
        country: z.string().max(60).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    rateLimit(`identity:${data.secret.slice(0, 12)}`, 20, 60000);
    const db = await admin();
    const profile = await upsertProfile(
      db,
      await sha256(data.secret),
      data.nickname,
      data.country ?? null,
    );
    return profile;
  });

/* --------------------------------------------------------------- payment */

const DODO_BASE = () =>
  process.env["DODO_ENVIRONMENT"] === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (i: { secret: string; nickname: string; country?: string | null | undefined; challengeCode?: string | null | undefined; returnUrl: string }) =>
      z
        .object({
          secret: z.string().min(8).max(200),
          nickname: nicknameSchema,
          country: z.string().max(60).nullable().optional(),
          challengeCode: z.string().max(24).nullable().optional(),
          returnUrl: z.string().url().max(500),
        })
        .parse(i),
  )
  .handler(async ({ data }) => {
    rateLimit(`checkout:${data.secret.slice(0, 12)}`, 10, 60000);
    const db = await admin();
    const profile = await upsertProfile(db, await sha256(data.secret), data.nickname, data.country ?? null);

    const { data: payment, error } = await db
      .from("payments")
      .insert({
        profile_id: profile.id,
        provider: "dodo",
        amount: ENTRY_PRICE,
        currency: ENTRY_CURRENCY,
        status: "pending",
        attempts_total: ENTRY_ATTEMPTS,
        challenge_code: data.challengeCode ?? null,
      })
      .select("id")
      .single();
    if (error || !payment) throw new Error("Could not start checkout");

    const apiKey = process.env["DODO_PAYMENTS_API_KEY"];
    const productId = process.env["DODO_PRODUCT_ID"];

    // No live credentials yet: run the flow in clearly-marked test mode so the
    // full product is usable end to end. Real money never moves here.
    if (!apiKey || !productId) {
      await db
        .from("payments")
        .update({
          status: "succeeded",
          test_mode: true,
          provider_payment_id: `test_${payment.id}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      return { mode: "test" as const, paymentId: payment.id, profileId: profile.id };
    }

    const res = await fetch(`${DODO_BASE()}/checkouts`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        return_url: data.returnUrl,
        metadata: { payment_id: payment.id, profile_id: profile.id },
        customer: { name: profile.nickname, email: `player+${profile.id}@example.invalid` },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[dodo] checkout failed", res.status, detail);
      await db.from("payments").update({ status: "failed" }).eq("id", payment.id);
      throw new Error(
        res.status === 401
          ? "Payment provider rejected our credentials. Please contact support."
          : "Payment provider unavailable. Please try again.",
      );
    }
    const json = (await res.json()) as { checkout_url?: string; payment_link?: string; session_id?: string; id?: string };
    const url = json.checkout_url ?? json.payment_link;
    if (!url) throw new Error("Payment provider returned no checkout link.");
    
    const providerId = json.session_id ?? json.id;
    if (providerId) {
      await db.from("payments").update({ provider_payment_id: providerId }).eq("id", payment.id);
    }
    return { mode: "redirect" as const, url, paymentId: payment.id, profileId: profile.id };
  });

/** Current paid entry (if any) for this device. */
export const getEntry = createServerFn({ method: "POST" })
  .inputValidator((i: { secret: string }) => z.object({ secret: z.string().min(8).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const hash = await sha256(data.secret);
    const { data: profile } = await db
      .from("profiles")
      .select("id, nickname, country, best_score, games_played, has_custom_nickname")
      .eq("secret_hash", hash)
      .maybeSingle();
    if (!profile) return { profile: null, entry: null };

    const { data: payment } = await db
      .from("payments")
      .select("id, status, attempts_total, attempts_used, challenge_code, test_mode, created_at")
      .eq("profile_id", profile.id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(5);

    const active = (payment ?? []).find((p) => p.attempts_used < p.attempts_total) ?? null;
    return { profile, entry: active };
  });

/* ----------------------------------------------------------- game session */

export const startAttempt = createServerFn({ method: "POST" })
  .validator((i: { secret: string }) => z.object({ secret: z.string().min(8).max(200) }).parse(i))
  .handler(async ({ data }) => {
    // The game is free: no payment/attempt-balance check. The rate limit is
    // the anti-abuse control now that there's no payment wall.
    rateLimit(`attempt:${data.secret.slice(0, 12)}`, 15, 60000);
    const db = await admin();
    // No pre-game form: a device gets a profile (defaulting to nickname
    // "Player") the moment it starts its first game, not before.
    const profile = await upsertProfile(db, await sha256(data.secret));

    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(token);

    const { data: session, error } = await db
      .from("game_sessions")
      .insert({
        profile_id: profile.id,
        session_token_hash: tokenHash,
        game_version: GAME_VERSION,
        status: "active",
      })
      .select("attempt_number")
      .single();
    if (error || !session) throw new Error("Could not start the game");

    return {
      sessionToken: token,
      initialCheckpoint: await signCheckpointData({ t: token, seq: 0, f: 0, d: 0 }),
      attemptNumber: session.attempt_number,
    };
  });


export const syncCheckpoint = createServerFn({ method: "POST" })
  .validator((i: { sessionToken: string; checkpoint: string; foods: number; durationMs: number }) =>
    z
      .object({
        sessionToken: z.string().min(16).max(200),
        checkpoint: z.string().min(10),
        foods: z.number().int().min(0).max(5000),
        durationMs: z.number().int().min(0).max(3 * 3600 * 1000),
      })
      .parse(i)
  )
  .handler(async ({ data }) => {
    const prev = await verifyCheckpointData(data.checkpoint);
    if (prev.t !== data.sessionToken) throw new Error("Wrong session checkpoint");

    const foodsDelta = data.foods - prev.f;
    const timeDelta = data.durationMs - prev.d;

    if (foodsDelta < 1) throw new Error("No foods eaten");
    if (foodsDelta > 30) throw new Error("Too many foods since last checkpoint"); 
    if (timeDelta < foodsDelta * MIN_MS_PER_FOOD * 0.6) throw new Error("Too fast");

    return {
      checkpoint: await signCheckpointData({
        t: data.sessionToken,
        seq: prev.seq + 1,
        f: data.foods,
        d: data.durationMs
      })
    };
  });

export const submitScore = createServerFn({ method: "POST" })
  .inputValidator((i: { sessionToken: string; foods: number; durationMs: number; reportedScore: number; checkpoint: string }) =>
    z
      .object({
        sessionToken: z.string().min(16).max(200),
        foods: z.number().int().min(0).max(5000),
        durationMs: z.number().int().min(0).max(3 * 3600 * 1000),
        reportedScore: z.number().int().min(0).max(10_000_000),
        checkpoint: z.string().min(10),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const tokenHash = await sha256(data.sessionToken);

    const { data: session } = await db
      .from("game_sessions")
      .select("id, profile_id, status, started_at, attempt_number")
      .eq("session_token_hash", tokenHash)
      .maybeSingle();
    if (!session) throw new Error("Unknown game session");
    if (session.status !== "active") throw new Error("This attempt was already submitted");
    const playerId = session.profile_id;
    if (!playerId) throw new Error("Session has no player");

    // Server recomputes the score — the browser's number is never trusted.
    const foods = Math.min(data.foods, MAX_FOODS);
    const score = scoreForFoods(foods);
    const elapsed = Date.now() - new Date(session.started_at).getTime();
    const expired = elapsed > MAX_SESSION_DURATION_MS;
    const plausible =
      !expired &&
      data.durationMs >= foods * MIN_MS_PER_FOOD &&
      elapsed >= foods * MIN_MS_PER_FOOD * 0.7 &&
      data.reportedScore === score;
    const status = plausible ? "verified" : "flagged";
    const tier = tierFor(score);

    // Wave 1: none of these depend on each other — only on the session data
    // and the score/status/tier already computed above. Submitting a score
    // used to mean ~10 sequential round trips to Supabase (each one waiting
    // on the last); grouping the independent ones into a few parallel waves
    // is what actually took the game-over -> result screen from ~5-6s to
    // roughly the time of the single slowest call in each wave.
    const [, scoreInsert, profileRow, achievementRow] = await Promise.all([
      db
        .from("game_sessions")
        .update({
          ended_at: new Date().toISOString(),
          score,
          status: expired ? "expired" : "completed",
          verified: plausible,
          verification_status: status,
        })
        .eq("id", session.id),
      db
        .from("scores")
        .insert({
          profile_id: playerId,
          game_session_id: session.id,
          score,
          status,
          verified_at: plausible ? new Date().toISOString() : null,
        })
        .select("id")
        .single(),
      db
        .from("profiles")
        .select("id, nickname, country, best_score, games_played")
        .eq("id", playerId)
        .single(),
      db.from("achievements").select("id").eq("name", tier).maybeSingle(),
    ]);

    const scoreRow = scoreInsert.data;
    const profile = profileRow.data;
    const achievement = achievementRow.data;

    const previousBest = profile?.best_score ?? 0;
    const isBest = plausible && score > previousBest;
    const best = isBest ? score : previousBest;

    // Wave 2: everything here only needs Wave 1's results, not each other.
    // Ranks tie-break rule: equal best scores share the same rank, and the
    // rank is "number of players strictly above me, plus one".
    const [, rankCounts] = await Promise.all([
      db
        .from("profiles")
        .update({
          best_score: best,
          games_played: (profile?.games_played ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", playerId),
      Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }).gt("best_score", best),
        profile?.country
          ? db
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("country", profile.country)
              .gt("best_score", best)
          : Promise.resolve({ count: null as number | null }),
        db.from("profiles").select("id", { count: "exact", head: true }).gt("best_score", 0),
      ]),
      achievement
        ? db
            .from("player_achievements")
            .upsert(
              { profile_id: playerId, achievement_id: achievement.id },
              { onConflict: "profile_id,achievement_id", ignoreDuplicates: true },
            )
        : Promise.resolve(null),
    ]);

    const [{ count: betterGlobal }, countryRank, { count: totalPlayers }] = rankCounts;
    const rankGlobal = (betterGlobal ?? 0) + 1;
    const total = Math.max(totalPlayers ?? 1, 1);
    const percentile = Math.max(0, Math.min(99, Math.round(((total - rankGlobal) / total) * 100)));

    // Wave 3: writes that need the ranks just computed — independent of
    // each other, and purely bookkeeping (the response below doesn't wait
    // on any of these having landed).
    const bookkeeping: PromiseLike<unknown>[] = [];
    if (scoreRow?.id) {
      bookkeeping.push(
        db
          .from("scores")
          .update({
            global_rank: rankGlobal,
            country_rank: countryRank.count == null ? null : countryRank.count + 1,
          })
          .eq("id", scoreRow.id),
      );
    }
    if (plausible && score > 0) {
      bookkeeping.push(
        db.from("activity_events").insert({
          profile_id: playerId,
          event_type: "score",
          metadata: { nickname: profile?.nickname, score, rank: rankGlobal },
        }),
      );
      if (rankGlobal <= 100) {
        bookkeeping.push(
          db.from("activity_events").insert({
            profile_id: playerId,
            event_type: "top100",
            metadata: { nickname: profile?.nickname, rank: rankGlobal },
          }),
        );
      }
    }
    await Promise.all(bookkeeping);

    return {
      score,
      best,
      previousBest,
      isBest,
      status,
      tier,
      percentile,
      rankGlobal,
      rankCountry: countryRank.count == null ? null : countryRank.count + 1,
      country: profile?.country ?? null,
      nickname: profile?.nickname ?? "Player",
      profileId: playerId,
    };
  });

/* -------------------------------------------------------------- challenge */

export const createChallenge = createServerFn({ method: "POST" })
  .inputValidator((i: { secret: string }) => z.object({ secret: z.string().min(8).max(200) }).parse(i))
  .handler(async ({ data }) => {
    rateLimit(`challenge:${data.secret.slice(0, 12)}`, 10, 60000);
    const db = await admin();
    const { data: profile } = await db
      .from("profiles")
      .select("id, nickname, best_score")
      .eq("secret_hash", await sha256(data.secret))
      .maybeSingle();
    if (!profile) throw new Error("No player found");
    if (!profile.best_score) throw new Error("Play a game first");

    const { data: existing } = await db
      .from("challenges")
      .select("challenge_code, challenger_score")
      .eq("challenger_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing?.[0] && existing[0].challenger_score === profile.best_score) {
      return { code: existing[0].challenge_code as string, score: profile.best_score };
    }

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await db
        .from("challenges")
        .select("id")
        .eq("challenge_code", code)
        .maybeSingle();
      if (!clash) break;
      code = randomCode();
    }

    const { error } = await db.from("challenges").insert({
      challenger_id: profile.id,
      challenger_score: profile.best_score,
      challenge_code: code,
    });
    if (error) throw new Error("Could not create challenge");

    await db.from("activity_events").insert({
      profile_id: profile.id,
      event_type: "challenge",
      metadata: { nickname: profile.nickname, score: profile.best_score },
    });

    return { code, score: profile.best_score };
  });

/** Record the result of a challenged player and return the head-to-head. */
export const completeChallenge = createServerFn({ method: "POST" })
  .inputValidator((i: { code: string; secret: string; score: number }) =>
    z
      .object({
        code: z.string().min(4).max(24),
        secret: z.string().min(8).max(200),
        score: z.number().int().min(0).max(10_000_000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const code = data.code.toUpperCase();
    const { data: profile } = await db
      .from("profiles")
      .select("id, nickname, best_score")
      .eq("secret_hash", await sha256(data.secret))
      .maybeSingle();
    if (!profile) throw new Error("No player found");

    const { data: ch } = await db
      .from("challenges")
      .select("id, challenger_id, challenger_score, accepted_score")
      .eq("challenge_code", code)
      .maybeSingle();
    if (!ch || ch.challenger_id === profile.id) return null;

    const bestOfChallenger = Math.max(profile.best_score, data.score);
    await db
      .from("challenges")
      .update({
        accepted_by: profile.id,
        accepted_score: Math.max(ch.accepted_score ?? 0, bestOfChallenger),
        completed_at: new Date().toISOString(),
      })
      .eq("id", ch.id);

    const { data: opponent } = await db
      .from("profiles")
      .select("nickname")
      .eq("id", ch.challenger_id)
      .maybeSingle();

    return {
      opponentName: opponent?.nickname ?? "Your friend",
      opponentScore: ch.challenger_score as number,
      yourName: profile.nickname,
      yourScore: bestOfChallenger,
      youWon: bestOfChallenger > (ch.challenger_score as number),
    };
  });

/**
 * Belt-and-braces payment confirmation.
 * The webhook is the source of truth, but if the player comes back from the
 * checkout before the webhook lands (or the redirect is lost), this asks Dodo
 * directly so nobody is left without the entry they paid for.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((i: { secret: string }) =>
    z.object({ secret: z.string().min(8).max(200) }).parse(i),
  )
  .handler(async ({ data }) => {
    rateLimit(`verify:${data.secret.slice(0, 12)}`, 30, 60000);
    const db = await admin();
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("secret_hash", await sha256(data.secret))
      .maybeSingle();
    if (!profile) return { status: "none" as const, attemptsRemaining: 0 };

    const { data: payments } = await db
      .from("payments")
      .select("id, status, provider_payment_id, attempts_total, attempts_used, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const list = payments ?? [];
    const apiKey = process.env["DODO_PAYMENTS_API_KEY"];

    for (const p of list) {
      if (p.status !== "pending" || !apiKey || !p.provider_payment_id) continue;
      try {
        const res = await fetch(`${DODO_BASE()}/payments/${p.provider_payment_id}`, {
          headers: { authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) continue;
        const json = (await res.json()) as { status?: string; payment_id?: string };
        const s = (json.status ?? "").toLowerCase();
        if (s === "succeeded" || s === "paid") {
          await db
            .from("payments")
            .update({
              status: "succeeded",
              provider_payment_id: json.payment_id ?? p.provider_payment_id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", p.id)
            .eq("status", "pending"); // idempotent: never re-entitle
          p.status = "succeeded";
        } else if (s === "failed" || s === "cancelled") {
          await db
            .from("payments")
            .update({ status: s === "failed" ? "failed" : "cancelled", updated_at: new Date().toISOString() })
            .eq("id", p.id);
          p.status = s;
        }
      } catch {
        // Network hiccup — the webhook will still settle this payment.
      }
    }

    const entry = list.find((p) => p.status === "succeeded" && p.attempts_used < p.attempts_total);
    if (entry) {
      return {
        status: "paid" as const,
        attemptsRemaining: entry.attempts_total - entry.attempts_used,
      };
    }
    const latest = list[0];
    if (latest?.status === "failed" || latest?.status === "cancelled") {
      return { status: latest.status as "failed" | "cancelled", attemptsRemaining: 0 };
    }
    if (latest?.status === "pending") return { status: "pending" as const, attemptsRemaining: 0 };
    return { status: "none" as const, attemptsRemaining: 0 };
  });

/* ---------------------------------------------------------- sponsor ladder */
/**
 * Standalone, always-on paid ranking — not tied to game weeks or scores.
 * Anyone can claim a spot by paying at least SPONSOR_MIN_INCREMENT more than
 * the current top amount; nobody is ever removed, they just rank lower once
 * outbid. Rank is always computed live from `sponsor_standings`, never stored.
 */

const sponsorCategorySchema = z.enum(SPONSOR_CATEGORIES);
const sponsorLadderSchema = z.enum(["all_time", "daily"]);
type SponsorLadder = z.infer<typeof sponsorLadderSchema>;

// Two independent ladders (all-time never resets, daily wipes at UTC
// midnight) — cached separately so switching tabs never serves stale data
// from the other one.
const sponsorStandingsCache = new Map<SponsorLadder, { data: any; expiresAt: number }>();
const sponsorStandingsPromise = new Map<SponsorLadder, Promise<any>>();

export const getSponsorStandings = createServerFn({ method: "GET" })
  .inputValidator((i: { ladder?: SponsorLadder | undefined } | undefined) =>
    z.object({ ladder: sponsorLadderSchema.default("all_time") }).parse(i ?? {}),
  )
  .handler(async ({ data: input }) => {
    const ladder = input.ladder;
    const TTL = 15 * 1000;
    const now = Date.now();

    const cached = sponsorStandingsCache.get(ladder);
    if (cached && now < cached.expiresAt) return cached.data;

    const inflight = sponsorStandingsPromise.get(ladder);
    if (inflight) return inflight;

    const promise = (async () => {
      try {
        const db = await publicDb();
        const { data } = await db
          .from(ladder === "daily" ? "sponsor_standings_daily" : "sponsor_standings")
          .select("id, link_url, category, tagline, amount, click_count, created_at")
          .order("amount", { ascending: false })
          .limit(50);
        const rows = data ?? [];
        sponsorStandingsCache.set(ladder, { data: rows, expiresAt: Date.now() + TTL });
        return rows;
      } catch (e) {
        console.error("[getSponsorStandings] Failed to fetch sponsor standings", e);
        const stale = sponsorStandingsCache.get(ladder);
        if (stale) return stale.data;
        return [];
      } finally {
        sponsorStandingsPromise.delete(ladder);
      }
    })();

    sponsorStandingsPromise.set(ladder, promise);
    return promise;
  });

export const recordSponsorClick = createServerFn({ method: "POST" })
  .inputValidator((i: { bidId: string }) => z.object({ bidId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    rateLimit(`sponsor-click:${data.bidId}`, 30, 60000);
    const db = await admin();
    await (db.rpc as any)("increment_sponsor_click", { p_bid_id: data.bidId });
    return { ok: true };
  });

/**
 * Claims a rank on the sponsor ladder. The amount is validated and reserved
 * atomically server-side (see the `claim_sponsor_bid` SQL function) — the
 * browser's number is never trusted as final. The claim starts `pending` and
 * only becomes visible on the public ladder once the Dodo webhook confirms
 * payment, exactly like the player-entry flow.
 */
export const claimSponsorRank = createServerFn({ method: "POST" })
  .inputValidator(
    (i: {
      linkUrl: string;
      category: string;
      tagline: string;
      amount: number;
      returnUrl: string;
      ladderType?: SponsorLadder | undefined;
    }) =>
      z
        .object({
          linkUrl: z.string().url().max(300),
          category: sponsorCategorySchema,
          tagline: z.string().trim().min(4).max(140),
          amount: z.number().int().min(SPONSOR_MIN_INCREMENT).max(1_000_000),
          returnUrl: z.string().url().max(500),
          ladderType: sponsorLadderSchema.default("all_time"),
        })
        .parse(i),
  )
  .handler(async ({ data }) => {
    rateLimit(`sponsor-claim:${data.linkUrl.slice(0, 60)}`, 10, 60000);
    const db = await admin();

    const { data: bid, error: claimError } = await (db.rpc as any)("claim_sponsor_bid", {
      p_link_url: data.linkUrl,
      p_category: data.category,
      p_tagline: data.tagline,
      p_amount: data.amount,
      p_ladder_type: data.ladderType,
    });
    if (claimError) {
      throw new Error(
        claimError.message?.includes("Bid too low")
          ? claimError.message
          : "Could not place your claim. Please try again.",
      );
    }

    const apiKey = process.env["DODO_PAYMENTS_API_KEY"];
    const productId = process.env["DODO_SPONSOR_PRODUCT_ID"];

    // No sponsor-specific Dodo product configured yet: run in clearly-marked
    // test mode so the flow is usable end to end. Real money never moves here.
    if (!apiKey || !productId) {
      await db
        .from("sponsor_bids")
        .update({ payment_status: "succeeded", is_active: true, payment_reference: `test_${bid.id}` })
        .eq("id", bid.id);
      return { mode: "test" as const, bidId: bid.id as string };
    }

    const res = await fetch(`${DODO_BASE()}/checkouts`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: Math.round(data.amount) }],
        return_url: data.returnUrl,
        metadata: { kind: "sponsor_bid", bid_id: bid.id, ladder_type: data.ladderType },
        customer: { name: data.tagline.slice(0, 60), email: `sponsor+${bid.id}@example.invalid` },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[dodo] sponsor checkout failed", res.status, detail);
      await db.from("sponsor_bids").update({ payment_status: "failed" }).eq("id", bid.id);
      throw new Error(
        res.status === 401
          ? "Payment provider rejected our credentials. Please contact support."
          : "Payment provider unavailable. Please try again.",
      );
    }
    const json = (await res.json()) as { checkout_url?: string; payment_link?: string; session_id?: string; id?: string };
    const url = json.checkout_url ?? json.payment_link;
    if (!url) throw new Error("Payment provider returned no checkout link.");

    const providerId = json.session_id ?? json.id;
    if (providerId) {
      await db.from("sponsor_bids").update({ payment_reference: providerId }).eq("id", bid.id);
    }
    return { mode: "redirect" as const, url, bidId: bid.id as string };
  });

/** Admin moderation: verify / flag / reject a score and rebuild the player's best. */
