import re

path = 'src/routes/play.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_result_phase = '''  if (phase === "result") {
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
                  : 🐍  STILL HAS THE CROWN}
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
  }'''

# find where phase === "result" starts
start_idx = content.find('if (phase === "result") {')
# find where the next top-level block starts or next phase
end_idx = content.find('  if (phase === "loading") {', start_idx)

new_content = content[:start_idx] + new_result_phase + '\n\n' + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
