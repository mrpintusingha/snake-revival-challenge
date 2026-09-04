import { useEffect, useState } from "react";
import { Gamepad2, Star, Users, Volume2, VolumeX } from "lucide-react";
import { audio } from "@/lib/audio";

function Stat({
  icon,
  label,
  value,
  labelFirst,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  labelFirst?: boolean;
}) {
  const valueEl = <span className="font-mono text-sm font-bold tabular-nums text-foreground">{value}</span>;
  const labelEl = (
    <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase sm:text-[11px]">{label}</span>
  );
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
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
    </div>
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
    <div className="mx-auto mb-4 flex max-w-full items-center gap-2 overflow-x-auto">
      <div className="neon-border flex shrink-0 items-center gap-3 rounded px-3.5 py-2">
        <Stat icon={<Users className="h-4 w-4" />} label="Playing" value={(playersOnline ?? 0).toLocaleString()} />
        <Stat icon={<Gamepad2 className="h-4 w-4" />} label="Played today" value={(gamesToday ?? 0).toLocaleString()} />
        <Stat
          icon={<Star className="h-4 w-4" />}
          label="High score"
          value={(topScoreToday ?? 0).toLocaleString()}
          labelFirst
        />
      </div>

      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
        className="neon-border flex h-9 w-9 shrink-0 items-center justify-center rounded"
      >
        {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
}
