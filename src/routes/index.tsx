import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Crown, Medal, Trophy } from "lucide-react";
import { SnakeGame } from "@/components/game/SnakeGame";
import { NokiaFrame } from "@/components/NokiaFrame";
import { LcdScreen } from "@/components/LcdScreen";
import { ScoreCard } from "@/components/ScoreCard";
import { ShareRow } from "@/components/ShareRow";
import { SponsorLadder } from "@/components/SponsorLadder";
import { StatusBar } from "@/components/StatusBar";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND } from "@/lib/config";
import type { SnakeState } from "@/lib/snake-engine";
import { track } from "@/lib/analytics";
import { getPendingChallenge, getPlayerSecret, setStoredProfileId } from "@/lib/player";
import { challengeUrl } from "@/lib/share";
import { countryName, listCountries } from "@/lib/countries";
import {
  completeChallenge,
  createChallenge,
  getEntry,
  getHomeData,
  getSuggestedCountry,
  getWeeklyLeaderboard,
  saveIdentity,
  startAttempt,
  submitScore,
} from "@/lib/api.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Play Free` },
      {
        name: "description",
        content: "The classic mobile Snake experience. Free to play, right now. Weekly leaderboard, friend challenges.",
      },
      { property: "og:title", content: `${BRAND.name} — Play Free` },
      { property: "og:description", content: "Bring back your childhood memories. Play free, right now." },
    ],
  }),
  component: Landing,
});

type Phase = "idle" | "transition" | "game" | "result";
type Result = Awaited<ReturnType<typeof submitScore>>;
type Battle = Awaited<ReturnType<typeof completeChallenge>>;

function Landing() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [hasIdentity, setHasIdentity] = useState(false);
  const [hasCountry, setHasCountry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const attemptCountRef = useRef(0);
  const [sessionToken, setSessionToken] = useState("");
  const [initialCheckpoint, setInitialCheckpoint] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [battle, setBattle] = useState<Battle>(null);
  const [code, setCode] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveCountry, setSaveCountry] = useState("");
  const countries = useMemo(() => listCountries(), []);

  const fnEntry = useServerFn(getEntry);
  const fnSaveIdentity = useServerFn(saveIdentity);
  const fnStart = useServerFn(startAttempt);
  const fnSubmit = useServerFn(submitScore);
  const fnChallenge = useServerFn(createChallenge);
  const fnComplete = useServerFn(completeChallenge);

  const { data } = useQuery({ queryKey: ["home"], queryFn: () => getHomeData(), staleTime: 30000 });
  const { data: weekly } = useQuery({
    queryKey: ["weekly-leaderboard"],
    queryFn: () => getWeeklyLeaderboard(),
    staleTime: 20000,
  });
  // Best-effort geo default for the country picker — absent outside Vercel
  // (local dev), in which case the picker just starts blank.
  const { data: geo } = useQuery({
    queryKey: ["suggested-country"],
    queryFn: () => getSuggestedCountry(),
    staleTime: Infinity,
  });
  const suggestedCountryCode = geo?.code ?? "";

  // Silent, non-blocking: learn whether this device already has a custom
  // name and a country on file, independently — a returning player who
  // picked a name before country capture existed still needs the country
  // prompt, so these can't share one flag.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fnEntry({ data: { secret: getPlayerSecret() } });
        if (cancelled || !res.profile) return;
        if (res.profile.has_custom_nickname) setHasIdentity(true);
        if (res.profile.country) setHasCountry(true);
        setStoredProfileId(res.profile.id);
      } catch {
        // empty — identity resolves lazily, never blocks play
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fnEntry]);

  const idleState = useMemo<SnakeState>(
    () => ({
      // A hand-placed coil, purely decorative — sits below the Start/Play
      // Again button, which itself sits right under the READY?/GAME OVER band.
      snake: [
        { x: 4, y: 12 }, { x: 5, y: 12 }, { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 },
        { x: 9, y: 12 }, { x: 10, y: 12 }, { x: 11, y: 12 }, { x: 12, y: 12 }, { x: 13, y: 12 },
        { x: 13, y: 13 },
        { x: 13, y: 14 }, { x: 12, y: 14 }, { x: 11, y: 14 }, { x: 10, y: 14 }, { x: 9, y: 14 },
        { x: 8, y: 14 }, { x: 7, y: 14 }, { x: 6, y: 14 }, { x: 5, y: 14 },
        { x: 5, y: 15 },
        { x: 6, y: 15 }, { x: 7, y: 15 }, { x: 8, y: 15 },
      ],
      dir: "right",
      queued: [],
      food: { x: -5, y: -5 },
      foods: 0,
      score: 0,
      over: false,
      rng: () => 0,
    }),
    [],
  );

  const beginAttempt = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fnStart({ data: { secret: getPlayerSecret() } });
      const isFirstAttempt = attemptCountRef.current === 0;
      attemptCountRef.current += 1;
      setSessionToken(res.sessionToken);
      setInitialCheckpoint(res.initialCheckpoint);
      setAttemptNumber(attemptCountRef.current);
      setResult(null);
      setBattle(null);
      setCode(null);
      track("official_game_started", { attempt: attemptCountRef.current });
      // The nostalgic "YOUR CHILDHOOD IS BACK" beat earns its place once, on
      // the very first game. Replays should feel instant — every artificial
      // delay here is friction between "I died" and "I'm playing again".
      if (isFirstAttempt) {
        setPhase("transition");
        setTimeout(() => setPhase("game"), 1200);
      } else {
        setPhase("game");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the game");
    } finally {
      setBusy(false);
    }
  }, [fnStart]);

  const onGameOver = useCallback(
    async (r: { score: number; foods: number; durationMs: number; checkpoint: string }) => {
      track("official_game_completed", { score: r.score });
      try {
        const res = await fnSubmit({
          data: {
            sessionToken,
            foods: r.foods,
            durationMs: r.durationMs,
            reportedScore: r.score,
            checkpoint: r.checkpoint,
          },
        });
        setResult(res);
        setStoredProfileId(res.profileId);
        track("score_submitted", { score: res.score, rank: res.rankGlobal });
        track(res.status === "verified" ? "score_verified" : "score_flagged", { score: res.score });

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

  const saveScoreName = async () => {
    // A returning player who already has a custom nickname is only here to
    // add a country — keep their existing name rather than force a re-type.
    const nickname = (saveName.trim() || result?.nickname || "").trim();
    if (nickname.length < 2) {
      toast.error("Pick a nickname first");
      return;
    }
    const country = countryName(saveCountry || suggestedCountryCode);
    setBusy(true);
    try {
      const profile = await fnSaveIdentity({
        data: { secret: getPlayerSecret(), nickname, country },
      });
      setStoredProfileId(profile.id);
      setHasIdentity(true);
      if (profile.country) setHasCountry(true);
      setResult((r) => (r ? { ...r, nickname: profile.nickname, country: profile.country ?? r.country } : r));
      toast.success("Saved!");
      track("score_name_saved", { withCountry: Boolean(country) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your name");
    } finally {
      setBusy(false);
    }
  };

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

  const gameColumn = (() => {
    if (phase === "transition") {
      return (
        <div className="flex min-h-[420px] items-center justify-center">
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
        <div className="flex flex-col items-center justify-center gap-4">
          <SnakeGame
            key={sessionToken}
            sessionToken={sessionToken}
            initialCheckpoint={initialCheckpoint}
            skipIntro={attemptNumber > 1}
            onGameOver={onGameOver}
            onAbort={() => setPhase("idle")}
          />
        </div>
      );
    }

    if (phase === "result") {
      const score = result?.score ?? 0;
      const url = code ? challengeUrl(code) : typeof window !== "undefined" ? window.location.origin : "";
      return (
        <div className="rise space-y-6">
          <div className="flex flex-col items-center">
            <NokiaFrame onPlay={() => void beginAttempt()} onReset={() => setPhase("idle")}>
              <LcdScreen
                state={idleState}
                overlay={{ lines: ["GAME OVER", `SCORE ${score.toLocaleString()}`] }}
                overlayAlign="top"
                stretch
              />
              <button
                type="button"
                onClick={() => void beginAttempt()}
                className="absolute top-[53%] left-1/2 -translate-x-1/2 rounded bg-black px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#9ead86]"
              >
                Play again
              </button>
            </NokiaFrame>
          </div>

          {(!hasIdentity || !hasCountry) && result && (
            <section className="rounded border border-primary/60 p-4 text-center">
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Get your name on the leaderboard
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasIdentity
                  ? `You're playing as ${result.nickname} — add your country so it's really you up there.`
                  : `You're playing as ${result.nickname} — add your name and country so it's really you up there.`}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  {!hasIdentity && (
                    <input
                      value={saveName}
                      maxLength={18}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder={result.nickname}
                      className="min-w-0 flex-1 rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  )}
                  <select
                    value={saveCountry || suggestedCountryCode}
                    onChange={(e) => setSaveCountry(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Country (optional)</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveScoreName}
                  className="w-full rounded bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </section>
          )}

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
                {battle.youWon ? "👑 YOU TOOK THE CROWN" : `🐍 ${battle.opponentName} STILL HAS THE CROWN`}
              </p>
            </section>
          )}

          <section className="text-center">
            <h1 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Your score</h1>
            <h2 className="font-mono text-6xl font-bold tabular-nums text-foreground mt-2">{score.toLocaleString()}</h2>
            {result?.isBest && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">Previous best: {result.previousBest.toLocaleString()}</p>
                <p className="pixel mt-2 text-[11px] text-primary">NEW PERSONAL BEST 🎉</p>
              </div>
            )}
            {result && (
              <>
                <h3 className="mt-4 pixel text-[11px] text-primary">GLOBAL #{result.rankGlobal}</h3>
                <h3 className="mt-2 text-sm text-muted-foreground">You beat {result.percentile}% of players.</h3>
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
              😈 WHO WAS BETTER AT SNAKE
              <br />
              YOU OR YOUR FRIENDS?
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
                <ShareRow
                  text={`I just scored ${score.toLocaleString()} on 90s Snake. Can you beat me?\n\n${url}`}
                  url={url}
                  card={{
                    score,
                    rank: result?.rankGlobal ?? 0,
                    nickname: result?.nickname ?? "Player",
                    tier: result?.tier ?? "Snake Rookie",
                  }}
                />
                <p className="text-center font-mono text-xs break-all text-muted-foreground bg-zinc-900/50 p-3 rounded">{url}</p>
              </div>
            )}
          </section>

          {code && result && (
            <div className="pt-4">
              <ScoreCard score={score} rank={result.rankGlobal} nickname={result.nickname} tier={result.tier} />
            </div>
          )}
        </div>
      );
    }

    // phase === "idle" — the game is just... there. No form, no click-through.
    return (
      <div className="flex flex-col items-center">
        <NokiaFrame onPlay={() => void beginAttempt()}>
          <LcdScreen
            state={idleState}
            overlay={{ lines: ["READY?", "ARROWS / SWIPE TO MOVE"] }}
            overlayAlign="top"
            stretch
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void beginAttempt()}
            className="absolute top-[53%] left-1/2 -translate-x-1/2 rounded bg-black px-6 py-2 text-xs font-bold uppercase tracking-wide text-[#9ead86] disabled:opacity-60"
          >
            {busy ? "One moment…" : "Start"}
          </button>
        </NokiaFrame>
      </div>
    );
  })();

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-[oklch(0.83_0.15_85)]" aria-hidden />;
    if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" aria-hidden />;
    if (rank === 3) return <Medal className="h-4 w-4 text-[oklch(0.7_0.12_55)]" aria-hidden />;
    return <span className="font-mono text-xs font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="crt-grid min-h-screen">
      <Header playersOnline={data?.playingNow} />

      <main className="mx-auto w-full max-w-7xl px-5 pb-16">
        <h1 className="sr-only">{BRAND.name} — {BRAND.tagline1} {BRAND.tagline2}</h1>
        <div className="rise grid grid-cols-1 gap-8 pt-8 lg:grid-cols-[480px_minmax(0,1fr)_300px]">
          <div className="order-2 lg:order-1">
            <SponsorLadder />
          </div>

          <div className="order-1 lg:order-2">
            <StatusBar playersOnline={data?.playingNow} gamesToday={data?.gamesToday} topScoreToday={data?.topScoreToday} />
            {gameColumn}
          </div>

          <div className="order-3 mt-2 lg:order-3 lg:mt-0">
            <section className="neon-border w-full rounded p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" aria-hidden />
                <h2 className="pixel text-[11px] text-primary sm:text-sm">HIGH SCORES</h2>
              </div>

              <p className="mt-3 text-[10px] tracking-widest text-muted-foreground uppercase">This week's top 3</p>
              <ol className="mt-2 divide-y divide-border border-y border-border">
                {(weekly?.rows ?? []).slice(0, 3).map((row: any) => (
                  <li key={row.profileId as string} className="flex items-center gap-3 py-3 text-sm">
                    <span className="flex w-6 justify-center">{rankIcon(row.rank as number)}</span>
                    <span className="flex-1 truncate font-bold uppercase tracking-wide">{row.nickname as string}</span>
                    <span className="w-20 text-right font-mono font-bold tabular-nums">
                      {(row.score as number).toLocaleString()}
                    </span>
                  </li>
                ))}
                {!weekly?.rows?.length && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No scores yet this week. The first name on this board could be yours.
                  </li>
                )}
              </ol>

              <p className="mt-6 text-[10px] tracking-widest text-muted-foreground uppercase">Top 20 — who's still got it?</p>
              <ol className="mt-2 divide-y divide-border border-y border-border">
                {(data?.leaderboard ?? []).slice(0, 20).map((row: any, i: number) => (
                  <li key={row.id as string} className="flex items-center gap-3 py-3 text-sm">
                    <span className="flex w-6 justify-center">{rankIcon(i + 1)}</span>
                    <Link to="/p/$id" params={{ id: row.id as string }} className="flex-1 truncate hover:text-primary font-bold uppercase tracking-wide">
                      {row.nickname as string}
                    </Link>
                    <span className="w-20 text-right font-mono font-bold tabular-nums">
                      {(row.best_score as number).toLocaleString()}
                    </span>
                  </li>
                ))}
                {!data?.leaderboard.length && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No scores yet. The first name on this board could be yours.
                  </li>
                )}
              </ol>
              <Link to="/leaderboard" className="mt-6 block text-center text-sm font-bold tracking-wide text-primary uppercase">
                VIEW FULL LEADERBOARD →
              </Link>
            </section>

            <a
              href="#sponsor"
              className="mt-6 flex items-center justify-between gap-4 rounded border border-dashed border-border p-4 hover:border-primary"
            >
              <span>
                <span className="block text-xs font-bold tracking-widest text-primary uppercase">Your brand here</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Ad space visible to thousands of players daily. Top position, maximum visibility.
                </span>
              </span>
              <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-dashed border-border text-center text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Your logo
              </span>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
