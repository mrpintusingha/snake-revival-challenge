import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { audio } from "@/lib/audio";

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

/** Compact single-row stats strip above the game — every number here is real (see getHomeData), no invented figures. */
export function StatusBar({
  playersOnline,
  gamesToday,
  topScoreToday,
}: {
  playersOnline?: number | undefined;
  gamesToday?: number | undefined;
  topScoreToday?: number | undefined;
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(audio.enabled);
  }, []);

  const toggleSound = () => {
    audio.enabled = !audio.enabled;
    setSoundEnabled(audio.enabled);
    if (audio.enabled) audio.init();
  };

  return (
    <div className="mx-auto mb-4 flex max-w-full items-center gap-1.5 overflow-x-auto">
      <div className="neon-border flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-muted-foreground">
        <Stat label="Playing" value={(playersOnline ?? 0).toLocaleString()} />
        <span aria-hidden>·</span>
        <Stat label="Played today" value={(gamesToday ?? 0).toLocaleString()} />
        <span aria-hidden>·</span>
        <Stat label="High score" value={(topScoreToday ?? 0).toLocaleString()} labelFirst />
      </div>

      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
        className="neon-border flex h-8 w-8 shrink-0 items-center justify-center rounded"
      >
        {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
}
