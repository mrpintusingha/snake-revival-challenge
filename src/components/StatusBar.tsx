import { useEffect, useState } from "react";
import { Gamepad2, Star, Users, Volume2, VolumeX } from "lucide-react";
import { audio } from "@/lib/audio";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <span className="sr-only">{label}: </span>
      <span className="font-mono text-sm font-bold tabular-nums text-foreground">{value}</span>
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
    <div className="neon-border mx-auto mb-4 flex w-full max-w-[360px] items-center justify-between rounded px-3.5 py-2">
      <Stat icon={<Users className="h-4 w-4" />} label="Players online" value={(playersOnline ?? 0).toLocaleString()} />
      <Stat icon={<Gamepad2 className="h-4 w-4" />} label="Games played today" value={(gamesToday ?? 0).toLocaleString()} />
      <Stat icon={<Star className="h-4 w-4" />} label="Today's high score" value={(topScoreToday ?? 0).toLocaleString()} />

      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
        className="flex items-center gap-1.5"
      >
        {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
        <span className="sr-only">Sound: </span>
        <span className="font-mono text-sm font-bold text-foreground">{soundEnabled ? "On" : "Off"}</span>
        <span className="flex items-end gap-[1.5px]" aria-hidden>
          {[3, 6, 10, 6, 3].map((h, i) => (
            <span
              key={i}
              className="w-[2px] rounded-full bg-primary"
              style={{
                height: h,
                opacity: soundEnabled ? 1 : 0.25,
                animation: soundEnabled ? `soundbar 0.9s ease-in-out ${i * 0.1}s infinite` : "none",
              }}
            />
          ))}
        </span>
      </button>

      <style>{`
        @keyframes soundbar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
