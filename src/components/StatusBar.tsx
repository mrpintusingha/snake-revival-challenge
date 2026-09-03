import { useEffect, useState } from "react";
import { Clock, Gamepad2, Star, Users, Volume2, VolumeX } from "lucide-react";
import { audio } from "@/lib/audio";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[9px] tracking-widest text-muted-foreground uppercase">{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">{value}</span>
      </span>
    </div>
  );
}

/** Bottom stats strip — every number here is real (see getHomeData), no invented figures. */
export function StatusBar({
  playersOnline,
  gamesToday,
  topScoreToday,
}: {
  playersOnline?: number | undefined;
  gamesToday?: number | undefined;
  topScoreToday?: number | undefined;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setNow(new Date());
    setSoundEnabled(audio.enabled);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleSound = () => {
    audio.enabled = !audio.enabled;
    setSoundEnabled(audio.enabled);
    if (audio.enabled) audio.init();
  };

  return (
    <div className="neon-border mx-auto mb-6 grid w-full max-w-[360px] grid-cols-2 gap-x-4 gap-y-3 rounded px-4 py-3">
      <Stat icon={<Users className="h-4 w-4" />} label="Players online" value={(playersOnline ?? 0).toLocaleString()} />
      <Stat icon={<Gamepad2 className="h-4 w-4" />} label="Games played today" value={(gamesToday ?? 0).toLocaleString()} />
      <Stat icon={<Star className="h-4 w-4" />} label="Today's high score" value={(topScoreToday ?? 0).toLocaleString()} />
      <Stat
        icon={<Clock className="h-4 w-4" />}
        label="Local time"
        value={now ? now.toLocaleTimeString([], { hour12: false }) : "--:--:--"}
      />

      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
        className="col-span-2 flex items-center justify-center gap-2 border-t border-border/60 pt-3"
      >
        {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
        <span className="flex items-center gap-2 leading-tight">
          <span className="text-[9px] tracking-widest text-muted-foreground uppercase">Sound</span>
          <span className="font-mono text-sm font-bold text-foreground">{soundEnabled ? "On" : "Off"}</span>
          <span className="flex items-end gap-[2px]" aria-hidden>
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
