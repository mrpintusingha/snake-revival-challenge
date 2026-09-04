function Stat({ label, value, labelFirst }: { label: string; value: string; labelFirst?: boolean }) {
  const valueEl = <span className="font-mono text-xs font-bold tabular-nums text-foreground">{value}</span>;
  const labelEl = <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {labelFirst ? (
        <>
          {labelEl}
          {valueEl}
        </>
      ) : (
        <>
          {valueEl}
          {labelEl}
        </>
      )}
    </span>
  );
}

/**
 * Compact single-row stats strip above the game — every number here is real
 * (see getHomeData), no invented figures. No sound toggle here — the game's
 * own screen already has one (SnakeGame.tsx), so this stays stats-only.
 */
export function StatusBar({
  playersOnline,
  gamesToday,
  topScoreToday,
}: {
  playersOnline?: number | undefined;
  gamesToday?: number | undefined;
  topScoreToday?: number | undefined;
}) {
  return (
    <div className="mb-4 flex max-w-full justify-center overflow-x-auto">
      <div className="neon-border flex w-fit shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-muted-foreground">
        <Stat label="Playing" value={(playersOnline ?? 0).toLocaleString()} />
        <span aria-hidden>·</span>
        <Stat label="Played today" value={(gamesToday ?? 0).toLocaleString()} />
        <span aria-hidden>·</span>
        <Stat label="High score" value={(topScoreToday ?? 0).toLocaleString()} labelFirst />
      </div>
    </div>
  );
}
