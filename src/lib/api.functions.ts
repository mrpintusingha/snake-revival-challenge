import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ENTRY_ATTEMPTS,
  ENTRY_CURRENCY,
  ENTRY_PRICE,
  GAME_VERSION,
  MAX_SESSION_DURATION_MS,
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

/* ------------------------------------------------------- public read data */

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const db = await publicDb();
  const since = new Date(Date.now() - 86400000).toISOString();

  const [players, top, challengesToday, activity, board, recentPlayers] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
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
  ]);

  return {
    players: players.count ?? 0,
    topScore: top.data?.[0]?.best_score ?? 0,
    challengesToday: challengesToday.count ?? 0,
    playingNow: recentPlayers.count ?? 0,
    activity: activity.data ?? [],
    leaderboard: board.data ?? [],
  };
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
    .select("id, nickname, country, best_score, games_played")
    .eq("secret_hash", secretHash)
    .maybeSingle();

  if (existing) {
    if ((nickname && nickname !== existing.nickname) || (country && country !== existing.country)) {
      const { data: updated } = await db
        .from("profiles")
        .update({
          nickname: nickname ?? existing.nickname,
          country: country ?? existing.country,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, nickname, country, best_score, games_played")
        .single();
      return updated ?? existing;
    }
    return existing;
  }

  const { data: created, error } = await db
    .from("profiles")
    .insert({ nickname: nickname ?? "Player", country: country ?? null, secret_hash: secretHash })
    .select("id, nickname, country, best_score, games_played")
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
    const json = (await res.json()) as { checkout_url?: string; payment_link?: string; session_id?: string };
    const url = json.checkout_url ?? json.payment_link;
    if (!url) throw new Error("Payment provider returned no checkout link.");
    if (json.session_id) {
      await db.from("payments").update({ provider_payment_id: json.session_id }).eq("id", payment.id);
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
      .select("id, nickname, country, best_score, games_played")
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
  .inputValidator((i: { secret: string }) => z.object({ secret: z.string().min(8).max(200) }).parse(i))
  .handler(async ({ data }) => {
    rateLimit(`attempt:${data.secret.slice(0, 12)}`, 15, 60000);
    const db = await admin();
    const hash = await sha256(data.secret);
    const { data: profile } = await db.from("profiles").select("id").eq("secret_hash", hash).maybeSingle();
    if (!profile) throw new Error("No player found. Enter the challenge first.");

    const { data: payments } = await db
      .from("payments")
      .select("id, attempts_total, attempts_used, challenge_code")
      .eq("profile_id", profile.id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(5);
    const entry = (payments ?? []).find((p) => p.attempts_used < p.attempts_total);
    if (!entry) throw new Error("No attempts remaining. Enter the challenge to play again.");

    const attemptNumber = entry.attempts_used + 1;
    const token = crypto.randomUUID() + crypto.randomUUID();
    const { error } = await db.from("game_sessions").insert({
      profile_id: profile.id,
      payment_id: entry.id,
      attempt_number: attemptNumber,
      session_token_hash: await sha256(token),
      game_version: GAME_VERSION,
      status: "active",
    });
    if (error) throw new Error("Could not start the game");

    await db
      .from("payments")
      .update({ attempts_used: attemptNumber, updated_at: new Date().toISOString() })
      .eq("id", entry.id);

    return {
      sessionToken: token,
      attemptNumber,
      attemptsRemaining: entry.attempts_total - attemptNumber,
      challengeCode: entry.challenge_code as string | null,
    };
  });

export const submitScore = createServerFn({ method: "POST" })
  .inputValidator((i: { sessionToken: string; foods: number; durationMs: number; reportedScore: number }) =>
    z
      .object({
        sessionToken: z.string().min(16).max(200),
        foods: z.number().int().min(0).max(5000),
        durationMs: z.number().int().min(0).max(3 * 3600 * 1000),
        reportedScore: z.number().int().min(0).max(10_000_000),
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

    await db
      .from("game_sessions")
      .update({
        ended_at: new Date().toISOString(),
        score,
        status: expired ? "expired" : "completed",
        verified: plausible,
        verification_status: status,
      })
      .eq("id", session.id);

    const { data: scoreRow } = await db
      .from("scores")
      .insert({
        profile_id: playerId,
        game_session_id: session.id,
        score,
        status,
        verified_at: plausible ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    const { data: profile } = await db
      .from("profiles")
      .select("id, nickname, country, best_score, games_played")
      .eq("id", playerId)
      .single();

    const previousBest = profile?.best_score ?? 0;
    const isBest = plausible && score > previousBest;
    await db
      .from("profiles")
      .update({
        best_score: isBest ? score : previousBest,
        games_played: (profile?.games_played ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    const best = isBest ? score : previousBest;

    // Ranks. Tie-break rule: equal best scores share the same rank, and the
    // rank is "number of players strictly above me, plus one".
    const [{ count: betterGlobal }, countryRank, { count: totalPlayers }] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }).gt("best_score", best),
      profile?.country
        ? db
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("country", profile.country)
            .gt("best_score", best)
        : Promise.resolve({ count: null }),
      db.from("profiles").select("id", { count: "exact", head: true }).gt("best_score", 0),
    ]);

    const rankGlobal = (betterGlobal ?? 0) + 1;
    const total = Math.max(totalPlayers ?? 1, 1);
    const percentile = Math.max(0, Math.min(99, Math.round(((total - rankGlobal) / total) * 100)));
    const tier = tierFor(score);

    if (scoreRow?.id) {
      await db
        .from("scores")
        .update({
          global_rank: rankGlobal,
          country_rank: countryRank.count == null ? null : countryRank.count + 1,
        })
        .eq("id", scoreRow.id);
    }

    // Achievement unlock
    const { data: achievement } = await db
      .from("achievements")
      .select("id")
      .eq("name", tier)
      .maybeSingle();
    if (achievement) {
      await db
        .from("player_achievements")
        .upsert(
          { profile_id: playerId, achievement_id: achievement.id },
          { onConflict: "profile_id,achievement_id", ignoreDuplicates: true },
        );
    }

    if (plausible && score > 0) {
      await db.from("activity_events").insert({
        profile_id: playerId,
        event_type: "score",
        metadata: { nickname: profile?.nickname, score, rank: rankGlobal },
      });
      if (rankGlobal <= 100) {
        await db.from("activity_events").insert({
          profile_id: playerId,
          event_type: "top100",
          metadata: { nickname: profile?.nickname, rank: rankGlobal },
        });
      }
    }

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

/** Admin moderation: verify / flag / reject a score and rebuild the player's best. */
