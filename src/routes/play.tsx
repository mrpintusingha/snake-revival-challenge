import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SnakeGame } from "@/components/SnakeGame";
import { ScoreCard } from "@/components/ScoreCard";
import { ShareRow } from "@/components/ShareRow";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, ENTRY_ATTEMPTS, formatPrice } from "@/lib/config";
import { track } from "@/lib/analytics";
import {
  getPendingChallenge,
  getPlayerSecret,
  setPendingChallenge,
  setStoredProfileId,
} from "@/lib/player";
import { challengeUrl, challengeShareText, scoreShareText } from "@/lib/share";
import {
  completeChallenge,
  createChallenge,
  getEntry,
  startAttempt,
  startCheckout,
  submitScore,
} from "@/lib/api.functions";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: `Enter the ${BRAND.name} — ${formatPrice()}` },
      {
        name: "description",
        content: `${ENTRY_ATTEMPTS} official attempts, a global ranking and a challenge link for your friends.`,
      },
      { property: "og:title", content: `Enter the ${BRAND.name}` },
      {
        property: "og:description",
        content: "Pay once, play three official attempts, keep your best score.",
      },
    ],
  }),
  component: PlayPage,
});

type Phase = "loading" | "entry" | "transition" | "game" | "result";

type Result = Awaited<ReturnType<typeof submitScore>>;
type Battle = Awaited<ReturnType<typeof completeChallenge>>;

const COUNTRIES = ["India", "United States", "United Kingdom", "Nigeria", "Brazil", "Indonesia", "Philippines", "Pakistan", "Bangladesh", "Germany", "Other"];

function PlayPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("loading");
  const [nickname, setNickname] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(0);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [sessionToken, setSessionToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [battle, setBattle] = useState<Battle>(null);
  const [code, setCode] = useState<string | null>(null);

  const fnEntry = useServerFn(getEntry);
  const fnCheckout = useServerFn(startCheckout);
  const fnStart = useServerFn(startAttempt);
  const fnSubmit = useServerFn(submitScore);
  const fnChallenge = useServerFn(createChallenge);
  const fnComplete = useServerFn(completeChallenge);

  // Session recovery: a paid entry survives refresh, tab close and slow networks.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fnEntry({ data: { secret: getPlayerSecret() } });
        if (cancelled) return;
        if (res.profile) {
          setNickname(res.profile.nickname === "Player" ? "" : res.profile.nickname);
          setCountry(res.profile.country ?? "");
          setStoredProfileId(res.profile.id);
        }
        if (res.entry) {
          setAttemptsRemaining(res.entry.attempts_total - res.entry.attempts_used);
          setPhase("entry");
        } else {
          setPhase("entry");
        }
      } catch {
        if (!cancelled) setPhase("entry");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fnEntry]);

  const [hasPaidEntry, setHasPaidEntry] = useState(false);
  useEffect(() => {
    setHasPaidEntry(attemptsRemaining > 0);
  }, [attemptsRemaining]);

  const beginAttempt = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fnStart({ data: { secret: getPlayerSecret() } });
      setSessionToken(res.sessionToken);
      setAttemptNumber(res.attemptNumber);
      setAttemptsRemaining(res.attemptsRemaining);
      setResult(null);
      setBattle(null);
      setPhase("transition");
      track("game_started", { attempt: res.attemptNumber });
      setTimeout(() => setPhase("game"), 1600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the game");
    } finally {
      setBusy(false);
    }
  }, [fnStart]);

  const pay = async () => {
    if (nickname.trim().length < 2) {
      toast.error("Pick a nickname first");
      return;
    }
    setBusy(true);
    track("checkout_started", { price: formatPrice() });
    try {
      const pending = getPendingChallenge();
      const res = await fnCheckout({
        data: {
          secret: getPlayerSecret(),
          nickname: nickname.trim(),
          country: country || null,
          challengeCode: pending,
          returnUrl: `${window.location.origin}/play`,
        },
      });
      if (res.profileId) setStoredProfileId(res.profileId);
      if (res.mode === "redirect") {
        window.location.href = res.url;
        return;
      }
      track("payment_completed", { mode: "test" });
      setAttemptsRemaining(ENTRY_ATTEMPTS);
      toast.success("Entry unlocked");
      await beginAttempt();
    } catch (e) {
      track("payment_failed");
      toast.error(e instanceof Error ? e.message : "Payment could not be started");
    } finally {
      setBusy(false);
    }
  };

  const onGameOver = useCallback(
    async (r: { score: number; foods: number; durationMs: number }) => {
      track("game_completed", { score: r.score });
      try {
        const res = await fnSubmit({
          data: {
            sessionToken,
            foods: r.foods,
            durationMs: r.durationMs,
            reportedScore: r.score,
          },
        });
        setResult(res);
        setStoredProfileId(res.profileId);
        track("score_submitted", { score: res.score, rank: res.rankGlobal });

        const pending = getPendingChallenge();
        if (pending) {
          const b = await fnComplete({
            data: { code: pending, secret: getPlayerSecret(), score: res.score },
          });
          setBattle(b);
          track("friend_game_completed", { won: b?.youWon });
        }
        setPhase("result");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save your score");
        setPhase("result");
      }
    },
    [fnSubmit, fnComplete, sessionToken],
  );

  const makeChallenge = async () => {
    setBusy(true);
    try {
      const res = await fnChallenge({ data: { secret: getPlayerSecret() } });
      setCode(res.code);
      track("challenge_created", { code: res.code });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the challenge");
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------------------------------------- render */

  if (phase === "loading") {
    return (
      <Shell>
        <p className="py-24 text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (phase === "transition") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="pixel text-center text-[13px] leading-[2] text-primary sm:text-lg">
          YOUR CHILDHOOD
          <br />
          IS BACK.
        </p>
      </div>
    );
  }

  if (phase === "game") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-6">
        <SnakeGame
          attemptNumber={attemptNumber}
          attemptsRemaining={attemptsRemaining}
          onGameOver={onGameOver}
        />
      </div>
    );
  }

  if (phase === "result") {
    const score = result?.score ?? 0;
    const url = code ? challengeUrl(code) : typeof window !== "undefined" ? window.location.origin : "";
    return (
      <Shell>
        <div className="rise space-y-8 py-6">
          {battle && (
            <section className="border border-border p-5 text-center bg-zinc-900/50">
              <h2 className="pixel text-[10px] text-primary">THE BATTLE</h2>
              <div className="mt-4 space-y-1 font-mono text-lg text-zinc-300">
                <p>
                  {battle.opponentName} — {battle.opponentScore.toLocaleString()}
                </p>
                <p className="text-primary">
                  {battle.yourName} — {battle.yourScore.toLocaleString()}
                </p>
              </div>
              <p className="mt-4 text-base font-bold text-zinc-100">
                {battle.youWon
                  ? "👑 YOU TOOK THE CROWN"
                  : `🐍 ${battle.opponentName} STILL HAS THE CROWN`}
              </p>
            </section>
          )}

          <section className="text-center">
            <h1 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Your score</h1>
            <h2 className="font-mono text-6xl font-bold tabular-nums text-foreground mt-2">{score.toLocaleString()}</h2>
            {result && (
              <>
                <h3 className="mt-4 pixel text-[11px] text-primary">GLOBAL #{result.rankGlobal}</h3>
                <h3 className="mt-2 text-sm text-muted-foreground">
                  You beat {result.percentile}% of players.
                </h3>
                <div className="mt-5 flex justify-center gap-5 text-sm text-zinc-400">
                  <span>🌍 Global: #{result.rankGlobal}</span>
                  {result.rankCountry && (
                    <span>
                      🏳️‍🌈 {result.country}: #{result.rankCountry}
                    </span>
                  )}
                </div>
                <p className="pixel mt-6 text-[12px] text-primary">{result.tier.toUpperCase()}</p>
                {result.status !== "verified" && (
                  <p className="mt-3 text-xs text-destructive">
                    This score was flagged for review and won't enter the leaderboard.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <p className="text-center text-xl sm:text-2xl font-bold leading-tight">
              😈 WHO WAS BETTER AT SNAKE — YOU OR YOUR FRIENDS?
            </p>
            {!code ? (
              <button
                type="button"
                disabled={busy}
                onClick={makeChallenge}
                className="w-full rounded bg-primary px-6 py-5 text-base font-bold tracking-wide text-primary-foreground uppercase disabled:opacity-60 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Challenge a friend
              </button>
            ) : (
              <div className="space-y-4">
                <ShareRow text={challengeShareText(score, url)} url={url} />
                <p className="text-center font-mono text-xs break-all text-muted-foreground bg-zinc-900/50 p-3 rounded">{url}</p>
              </div>
            )}
          </section>

          {code && result && (
            <div className="pt-4">
              <ScoreCard
                score={score}
                rank={result.rankGlobal}
                nickname={result.nickname}
                tier={result.tier}
              />
            </div>
          )}

          <section className="space-y-3 pt-4 border-t border-border">
            {attemptsRemaining > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  track("repeat_attempt");
                  setPhase("transition");
                  setResult(null);
                  setCode(null);
                  setAttemptNumber((n) => n + 1);
                }}
                className="w-full rounded border border-border px-6 py-5 text-sm font-bold tracking-wide uppercase hover:bg-accent"
              >
                Remember how you always wanted one more try? ({attemptsRemaining} left)
              </button>
            ) : (
              <Link
                to="/leaderboard"
                className="block w-full rounded border border-border px-6 py-4 text-center text-sm font-bold tracking-wide uppercase hover:bg-accent"
              >
                See final leaderboard
              </Link>
            )}
          </section>
        </div>
      </Shell>
    );
  }



  return null;
}
