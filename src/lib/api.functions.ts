import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestIP, getRequestProtocol } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  GAME_VERSION,
  MAX_SESSION_DURATION_MS,
  SPONSOR_CATEGORIES,
  SPONSOR_MIN_INCREMENT,
  tierFor,
} from "./config";
import { MAX_FOODS, MIN_MS_PER_FOOD, scoreForFoods } from "./scoring";
import { normalizeSponsorLink } from "./sponsorLink";

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

/**
 * The origin to send a payment provider back to after checkout — derived
 * from the incoming request itself (Vercel-set Host/proto headers), never
 * from client-supplied input. A client-controlled return_url would let
 * anyone redirect a real Dodo checkout's post-payment landing page
 * anywhere they want (an open-redirect useful for phishing follow-ups).
 */
function trustedOrigin(): string {
  const host = getRequestHost({ xForwardedHost: true });
  const protocol = getRequestProtocol({ xForwardedProto: true });
  if (!host) return "http://localhost:8080";
  return `${protocol === "http" ? "http" : "https"}://${host}`;
}

/** Best-effort caller IP for rate limiting — defense in depth alongside the per-field limits below (all in-memory, so not a substitute for provider-side abuse controls on a serverless deployment). */
function requestIp(): string {
  return getRequestIP({ xForwardedFor: true }) ?? "unknown";
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

/**
 * Records a unique visit — idempotent, so it's safe to call opportunistically
 * on every session. Counts anyone who loads the site, not just people who
 * end up playing (profiles undercounts real traffic).
 */
export const recordVisit = createServerFn({ method: "POST" })
  .inputValidator((i: { secret: string }) => z.object({ secret: z.string().min(8).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const hash = await sha256(data.secret);
    await db.from("site_visitors").upsert({ visitor_hash: hash }, { onConflict: "visitor_hash", ignoreDuplicates: true });
    return { ok: true };
  });

let visitorStatsCache: { data: { totalVisitors: number }; expiresAt: number } | null = null;
let visitorStatsPromise: Promise<{ totalVisitors: number }> | null = null;

export const getVisitorStats = createServerFn({ method: "GET" }).handler(async () => {
  const TTL = 30 * 1000;
  const now = Date.now();

  if (visitorStatsCache && now < visitorStatsCache.expiresAt) return visitorStatsCache.data;
  if (visitorStatsPromise) return visitorStatsPromise;

  visitorStatsPromise = (async () => {
    try {
      const db = await admin();
      const { count } = await db.from("site_visitors").select("visitor_hash", { count: "exact", head: true });
      const data = { totalVisitors: count ?? 0 };
      visitorStatsCache = { data, expiresAt: Date.now() + TTL };
      return data;
    } catch (e) {
      console.error("[getVisitorStats] Failed to fetch visitor stats", e);
      if (visitorStatsCache) return visitorStatsCache.data;
      return { totalVisitors: 0 };
    } finally {
      visitorStatsPromise = null;
    }
  })();

  return visitorStatsPromise;
});

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

/** Learn whether this device already has a custom nickname/country on file. */
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
    return { profile: profile ?? null };
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

// The claim form's placeholder invites a bare domain ("calllive.ai") or an
// "@handle" — normalizeSponsorLink resolves both to a real https URL (the
// same normalization the client uses for its favicon/preview display), so
// what actually gets stored/linked matches what the sponsor saw in the form
// instead of a technically-valid-but-meaningless URL like "https://@handle".
const sponsorLinkUrlSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  return normalizeSponsorLink(val);
}, z.string().url().max(300));

// Hostnames a link-preview fetch must never be allowed to reach — loopback,
// private ranges, and cloud metadata endpoints. This is a best-effort literal
// blocklist (no DNS-resolution check), sufficient for a low-stakes preview
// feature but not a substitute for a real egress-controlled fetch proxy.
const BLOCKED_PREVIEW_HOSTS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /\.local$/i,
  /^metadata\.google\.internal$/i,
];

function extractMetaContent(html: string, attr: "property" | "name", key: string): string | null {
  const tagRe = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*>`, "i");
  const tag = html.match(tagRe)?.[0];
  const contentMatch = tag?.match(/content=["']([^"']*)["']/i);
  if (contentMatch?.[1]) return contentMatch[1];
  // Attribute order can vary (content before the key attribute).
  const reversed = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, "i");
  return html.match(reversed)?.[1] ?? null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Fetches just enough of a page's <head> to pull a title/description for the claim-form preview. */
async function fetchPageMeta(rawUrl: string): Promise<{ title: string | null; description: string | null }> {
  let url: URL;
  try {
    url = new URL(normalizeSponsorLink(rawUrl));
  } catch {
    return { title: null, description: null };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { title: null, description: null };
  if (BLOCKED_PREVIEW_HOSTS.some((re) => re.test(url.hostname))) return { title: null, description: null };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; SnakeLinkPreview/1.0)" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return { title: null, description: null };

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let total = 0;
      while (total < 100_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        total += value.length;
        if (/<\/head>/i.test(html)) break;
      }
      await reader.cancel().catch(() => {});
    } else {
      html = (await res.text()).slice(0, 100_000);
    }

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
    const ogTitle = extractMetaContent(html, "property", "og:title");
    const ogDescription = extractMetaContent(html, "property", "og:description");
    const metaDescription = extractMetaContent(html, "name", "description");

    const title = ogTitle ?? titleTag;
    const description = ogDescription ?? metaDescription;
    return {
      title: title ? decodeEntities(title).slice(0, 140) : null,
      description: description ? decodeEntities(description).slice(0, 140) : null,
    };
  } catch {
    return { title: null, description: null };
  } finally {
    clearTimeout(timeout);
  }
}

/** Live preview for the sponsor claim form: favicon is derived client-side, this just fetches title/description. */
export const fetchLinkPreview = createServerFn({ method: "POST" })
  .inputValidator((i: { url: string }) => z.object({ url: z.string().min(4).max(300) }).parse(i))
  .handler(async ({ data }) => {
    rateLimit(`link-preview:${data.url.slice(0, 60)}`, 20, 60000);
    return fetchPageMeta(data.url);
  });

// Two independent ladders (all-time never resets, daily wipes at UTC
// midnight) — cached separately, and further keyed by page so switching
// tabs or pages never serves stale data from another combination. The
// underlying views are backed by a partial index on (amount DESC), so
// range-based pagination stays cheap however many sponsors join — this
// isn't a "top 50" list capped for convenience, it's meant to scale to
// thousands of active listings.
const SPONSOR_PAGE_SIZE = 20;
const sponsorStandingsCache = new Map<string, { rows: any[]; totalCount: number; expiresAt: number }>();
const sponsorStandingsPromise = new Map<string, Promise<{ rows: any[]; totalCount: number }>>();

// The floor for "claim #1" only ever depends on the single highest active
// amount, never on which page is currently being browsed — cached
// separately (keyed only by ladder, not page) so it's cheap to include on
// every page's response without re-querying it per page.
const sponsorTopAmountCache = new Map<SponsorLadder, { amount: number; expiresAt: number }>();
const sponsorTopAmountPromise = new Map<SponsorLadder, Promise<number>>();

async function fetchSponsorTopAmount(ladder: SponsorLadder): Promise<number> {
  const TTL = 15 * 1000;
  const now = Date.now();
  const cached = sponsorTopAmountCache.get(ladder);
  if (cached && now < cached.expiresAt) return cached.amount;
  const inflight = sponsorTopAmountPromise.get(ladder);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const db = await publicDb();
      const { data } = await db
        .from(ladder === "daily" ? "sponsor_standings_daily" : "sponsor_standings")
        .select("amount")
        .order("amount", { ascending: false })
        .limit(1);
      const amount = data?.[0]?.amount ?? 0;
      sponsorTopAmountCache.set(ladder, { amount, expiresAt: Date.now() + TTL });
      return amount;
    } catch (e) {
      console.error("[getSponsorStandings] Failed to fetch top amount", e);
      return sponsorTopAmountCache.get(ladder)?.amount ?? 0;
    } finally {
      sponsorTopAmountPromise.delete(ladder);
    }
  })();
  sponsorTopAmountPromise.set(ladder, promise);
  return promise;
}

/** The single highest active all-time bid — powers the header's "Top bid $X" stat. */
export const getSponsorTopBid = createServerFn({ method: "GET" }).handler(async () => {
  return { amount: await fetchSponsorTopAmount("all_time") };
});

export const getSponsorStandings = createServerFn({ method: "GET" })
  .inputValidator((i: { ladder?: SponsorLadder | undefined; page?: number | undefined } | undefined) =>
    z
      .object({
        ladder: sponsorLadderSchema.default("all_time"),
        page: z.number().int().min(1).max(1000).default(1),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data: input }) => {
    const { ladder, page } = input;
    const TTL = 15 * 1000;
    const now = Date.now();
    const cacheKey = `${ladder}:${page}`;

    const topAmount = await fetchSponsorTopAmount(ladder);

    const cached = sponsorStandingsCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return { rows: cached.rows, totalCount: cached.totalCount, page, pageSize: SPONSOR_PAGE_SIZE, topAmount };
    }

    const inflight = sponsorStandingsPromise.get(cacheKey);
    if (inflight) {
      const res = await inflight;
      return { rows: res.rows, totalCount: res.totalCount, page, pageSize: SPONSOR_PAGE_SIZE, topAmount };
    }

    const promise = (async () => {
      try {
        const db = await publicDb();
        const from = (page - 1) * SPONSOR_PAGE_SIZE;
        const to = from + SPONSOR_PAGE_SIZE - 1;
        const { data, count } = await db
          .from(ladder === "daily" ? "sponsor_standings_daily" : "sponsor_standings")
          .select("id, link_url, category, tagline, amount, click_count, created_at", { count: "exact" })
          .order("amount", { ascending: false })
          .range(from, to);
        const rows = data ?? [];
        const totalCount = count ?? 0;
        sponsorStandingsCache.set(cacheKey, { rows, totalCount, expiresAt: Date.now() + TTL });
        return { rows, totalCount };
      } catch (e) {
        console.error("[getSponsorStandings] Failed to fetch sponsor standings", e);
        const stale = sponsorStandingsCache.get(cacheKey);
        if (stale) return { rows: stale.rows, totalCount: stale.totalCount };
        return { rows: [], totalCount: 0 };
      } finally {
        sponsorStandingsPromise.delete(cacheKey);
      }
    })();

    sponsorStandingsPromise.set(cacheKey, promise);
    const res = await promise;
    return { rows: res.rows, totalCount: res.totalCount, page, pageSize: SPONSOR_PAGE_SIZE, topAmount };
  });

let sponsorActivityCache: { data: any[]; expiresAt: number } | null = null;
let sponsorActivityPromise: Promise<any[]> | null = null;

/**
 * Real sponsor-claim events only (see recordSponsorClaimActivity) — never
 * mixed with game activity, so the Live Activity feed shows exactly what
 * it says: recent bids, not a fallback to something else when there
 * aren't any yet.
 */
export const getSponsorActivity = createServerFn({ method: "GET" }).handler(async () => {
  const TTL = 20 * 1000;
  const now = Date.now();

  if (sponsorActivityCache && now < sponsorActivityCache.expiresAt) return { activity: sponsorActivityCache.data };
  if (sponsorActivityPromise) return { activity: await sponsorActivityPromise };

  sponsorActivityPromise = (async () => {
    try {
      const db = await publicDb();
      const { data } = await db
        .from("activity_events")
        .select("id, event_type, metadata, created_at")
        .eq("event_type", "sponsor_claim")
        .order("created_at", { ascending: false })
        .limit(8);
      const rows = data ?? [];
      sponsorActivityCache = { data: rows, expiresAt: Date.now() + TTL };
      return rows;
    } catch (e) {
      console.error("[getSponsorActivity] Failed to fetch sponsor activity", e);
      return sponsorActivityCache?.data ?? [];
    } finally {
      sponsorActivityPromise = null;
    }
  })();

  return { activity: await sponsorActivityPromise };
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
 * Records a real "X claimed #N for $Y" entry in the same activity_events feed
 * the homepage's Live Activity list already reads from — called exactly once
 * per bid, right after it's confirmed as the actual transition into
 * `payment_status = 'succeeded'` (never speculatively, and never on a
 * redundant re-confirmation). Best-effort: a failure here must never break
 * the payment-confirmation path it's attached to.
 */
export async function recordSponsorClaimActivity(
  db: Awaited<ReturnType<typeof admin>>,
  bid: { link_url: string; amount: number; ladder_type: string; slot_date: string | null },
) {
  try {
    let rankQuery = db
      .from("sponsor_bids")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("ladder_type", bid.ladder_type)
      .gt("amount", bid.amount);
    if (bid.ladder_type === "daily" && bid.slot_date) {
      rankQuery = rankQuery.eq("slot_date", bid.slot_date);
    }
    const { count } = await rankQuery;
    const rank = (count ?? 0) + 1;

    let domain = bid.link_url;
    try {
      domain = new URL(bid.link_url).hostname.replace(/^www\./, "");
    } catch {
      // Keep the raw link_url as a last resort — better than dropping the event.
    }

    await db.from("activity_events").insert({
      event_type: "sponsor_claim",
      metadata: { domain, amount: bid.amount, rank, ladderType: bid.ladder_type },
    });
  } catch (e) {
    console.error("[recordSponsorClaimActivity] Failed to record activity", e);
  }
}

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
      ladderType?: SponsorLadder | undefined;
    }) =>
      z
        .object({
          linkUrl: sponsorLinkUrlSchema,
          category: sponsorCategorySchema,
          tagline: z.string().trim().min(4).max(140),
          amount: z.number().int().min(SPONSOR_MIN_INCREMENT).max(1_000_000),
          ladderType: sponsorLadderSchema.default("all_time"),
        })
        .parse(i),
  )
  .handler(async ({ data }) => {
    // Per-URL AND per-IP: a per-field limit alone is trivially bypassed by
    // varying the URL on every request.
    rateLimit(`sponsor-claim:${data.linkUrl.slice(0, 60)}`, 10, 60000);
    rateLimit(`sponsor-claim-ip:${requestIp()}`, 15, 60000);
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
        claimError.message?.includes("Bid too low") || claimError.message?.includes("Bid must be")
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
      await recordSponsorClaimActivity(db, {
        link_url: bid.link_url,
        amount: bid.amount,
        ladder_type: bid.ladder_type,
        slot_date: bid.slot_date,
      });
      return { mode: "test" as const, bidId: bid.id as string };
    }

    // The return URL is built entirely server-side from the request's own
    // host — never from client input — with a claim marker appended so the
    // page can reliably confirm/poll this exact bid once Dodo redirects
    // the sponsor back.
    const returnUrl = new URL("/", trustedOrigin());
    returnUrl.searchParams.set("claim", bid.id);

    const res = await fetch(`${DODO_BASE()}/checkouts`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        // A "Pay What You Want" product: `amount` (in cents) is the exact
        // total charged, unlike a fixed-price product where only quantity
        // can vary — the right mechanism for an arbitrary bid amount.
        product_cart: [{ product_id: productId, quantity: 1, amount: Math.round(data.amount * 100) }],
        return_url: returnUrl.toString(),
        metadata: { kind: "sponsor_bid", bid_id: bid.id, ladder_type: data.ladderType },
        // Every amount in this app — the RPC's floor check, the claim
        // form, the ladder — is a whole US dollar figure. Without locking
        // this, Dodo's adaptive pricing can localize checkout to the
        // buyer's local currency: a sponsor intending to pay $2 was
        // instead charged ₹231.81 (India's adaptive-priced equivalent),
        // which our own code then nearly mis-recorded as "$231.81" by
        // reading the local-currency total without checking its currency.
        billing_currency: "USD",
        feature_flags: { allow_currency_selection: false },
        // No fabricated name/email — our claim form never collects real
        // contact info, so let Dodo's own hosted checkout ask the sponsor
        // for their actual name/email directly rather than pre-filling
        // wrong or fake data (a real @example.invalid placeholder would
        // silently swallow their payment receipt).
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
    const json = (await res.json()) as {
      checkout_url?: string | null;
      payment_id?: string | null;
      session_id?: string;
    };
    const url = json.checkout_url;
    if (!url) throw new Error("Payment provider returned no checkout link.");

    const providerId = json.payment_id ?? json.session_id;
    if (providerId) {
      await db.from("sponsor_bids").update({ payment_reference: providerId }).eq("id", bid.id);
    }
    return { mode: "redirect" as const, url, bidId: bid.id as string };
  });

/**
 * Belt-and-braces confirmation for one sponsor claim, used right after
 * redirecting back from Dodo checkout. The webhook is the source of truth
 * and usually wins the race; this asks Dodo directly as a fallback so a
 * sponsor isn't left staring at "pending" if the webhook is delayed or lost.
 */
export const getSponsorClaimStatus = createServerFn({ method: "POST" })
  .inputValidator((i: { bidId: string }) => z.object({ bidId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    rateLimit(`sponsor-claim-status:${data.bidId}`, 20, 60000);
    const db = await admin();
    const { data: bid } = await db
      .from("sponsor_bids")
      .select("id, payment_status, payment_reference, amount, link_url, ladder_type, slot_date")
      .eq("id", data.bidId)
      .maybeSingle();
    if (!bid) return { status: "not_found" as const };
    if (bid.payment_status === "succeeded") {
      return { status: "succeeded" as const, amount: bid.amount, linkUrl: bid.link_url };
    }
    if (bid.payment_status === "failed") return { status: "failed" as const };

    const apiKey = process.env["DODO_PAYMENTS_API_KEY"];
    if (apiKey && bid.payment_reference && !bid.payment_reference.startsWith("test_")) {
      try {
        const res = await fetch(`${DODO_BASE()}/payments/${bid.payment_reference}`, {
          headers: { authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const json = (await res.json()) as {
            status?: string;
            // See the webhook handler for why settlement_amount/currency
            // (normalized to the merchant's USD payout), not total_amount/
            // currency (whatever currency the buyer's checkout localized
            // to), is the only safe field to verify a USD claim against.
            settlement_amount?: number;
            settlement_currency?: string;
          };
          const s = (json.status ?? "").toLowerCase();
          if (s === "succeeded" || s === "paid") {
            // Same amount check as the webhook: never activate at more than
            // what Dodo actually reports collected, in USD.
            let activatedAmount = bid.amount;
            const claimedCents = Math.round(bid.amount * 100);
            if (json.settlement_currency === "USD" && typeof json.settlement_amount === "number" && json.settlement_amount !== claimedCents) {
              activatedAmount = Math.max(0, json.settlement_amount) / 100;
              console.error(
                `[getSponsorClaimStatus] amount mismatch for bid ${bid.id}: claimed $${bid.amount}, Dodo settlement reports $${activatedAmount}. Activating at the settled amount.`,
              );
            }

            // .eq("payment_status", "pending") makes this a no-op if the
            // webhook already won the race — .select() tells us whether THIS
            // call actually performed the transition, so the activity event
            // fires exactly once regardless of which path confirms first.
            const { data: updated } = await db
              .from("sponsor_bids")
              .update({ payment_status: "succeeded", is_active: true, amount: activatedAmount })
              .eq("id", bid.id)
              .eq("payment_status", "pending")
              .select("id");
            if (updated && updated.length > 0) {
              await recordSponsorClaimActivity(db, {
                link_url: bid.link_url,
                amount: activatedAmount,
                ladder_type: bid.ladder_type,
                slot_date: bid.slot_date,
              });
            }
            return { status: "succeeded" as const, amount: activatedAmount, linkUrl: bid.link_url };
          }
          if (s === "failed" || s === "cancelled") {
            await db.from("sponsor_bids").update({ payment_status: "failed" }).eq("id", bid.id).eq("payment_status", "pending");
            return { status: "failed" as const };
          }
        }
      } catch {
        // Network hiccup — keep polling, the webhook may still land.
      }
    }
    return { status: "pending" as const };
  });

/** Admin moderation: verify / flag / reject a score and rebuild the player's best. */
