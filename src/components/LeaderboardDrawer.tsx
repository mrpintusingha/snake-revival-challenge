import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Medal, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-[oklch(0.83_0.15_85)]" aria-hidden />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" aria-hidden />;
  if (rank === 3) return <Medal className="h-4 w-4 text-[oklch(0.7_0.12_55)]" aria-hidden />;
  return <span className="font-mono text-xs font-bold text-muted-foreground">#{rank}</span>;
}

/**
 * Trigger tab for the leaderboard drawer — meant to be rendered inside a
 * `position: relative` wrapper sized to the phone frame (not placed at the
 * page level), so it visually hangs off the frame's own right edge instead
 * of the browser viewport's edge, which drifted far from the frame on any
 * wide desktop window.
 */
export function LeaderboardTabButton({ onOpen, hidden }: { onOpen: () => void; hidden: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open high scores"
      className={cn(
        "neon-border absolute top-1/2 left-full z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-r-lg rounded-l-none border-l-0 bg-card px-2 py-4 transition-opacity",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <Trophy className="h-4 w-4 text-primary" aria-hidden />
      <span className="pixel text-[9px] tracking-widest text-primary" style={{ writingMode: "vertical-rl" }}>
        HIGH SCORES
      </span>
    </button>
  );
}

/**
 * Player leaderboard panel — slides in from the viewport's right edge
 * exactly as before; only its trigger tab (LeaderboardTabButton) moved to
 * attach to the phone frame instead of living here.
 */
export function LeaderboardDrawer({
  open,
  onOpenChange,
  weeklyRows,
  topRows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeklyRows: { profileId: string; rank: number; nickname: string; score: number }[];
  topRows: { id: string; nickname: string; best_score: number }[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "neon-border fixed inset-y-0 right-0 z-50 w-[90vw] max-w-[340px] overflow-y-auto border-r-0 bg-card p-4 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="High scores"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="pixel text-[11px] text-primary sm:text-sm">HIGH SCORES</h2>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close" className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mt-3 text-[10px] tracking-widest text-muted-foreground uppercase">This week's top 3</p>
        <ol className="mt-2 divide-y divide-border border-y border-border">
          {weeklyRows.slice(0, 3).map((row) => (
            <li key={row.profileId} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex w-6 justify-center">{rankIcon(row.rank)}</span>
              <span className="flex-1 truncate font-bold uppercase tracking-wide">{row.nickname}</span>
              <span className="w-20 text-right font-mono font-bold tabular-nums">{row.score.toLocaleString()}</span>
            </li>
          ))}
          {!weeklyRows.length && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No scores yet this week. The first name on this board could be yours.
            </li>
          )}
        </ol>

        <p className="mt-6 text-[10px] tracking-widest text-muted-foreground uppercase">Top 20 — who's still got it?</p>
        <ol className="mt-2 divide-y divide-border border-y border-border">
          {topRows.slice(0, 20).map((row, i) => (
            <li key={row.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex w-6 justify-center">{rankIcon(i + 1)}</span>
              <Link
                to="/p/$id"
                params={{ id: row.id }}
                onClick={() => onOpenChange(false)}
                className="flex-1 truncate font-bold uppercase tracking-wide hover:text-primary"
              >
                {row.nickname}
              </Link>
              <span className="w-20 text-right font-mono font-bold tabular-nums">{row.best_score.toLocaleString()}</span>
            </li>
          ))}
          {!topRows.length && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No scores yet. The first name on this board could be yours.
            </li>
          )}
        </ol>
        <Link
          to="/leaderboard"
          className="mt-6 block text-center text-sm font-bold tracking-wide text-primary uppercase"
        >
          VIEW FULL LEADERBOARD →
        </Link>
      </div>
    </>
  );
}
