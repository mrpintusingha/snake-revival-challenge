import { useCallback, useEffect, useRef, useState } from "react";
import { LcdScreen, type Overlay } from "./LcdScreen";
import { createState, step, tickFor, turn, type Dir, type SnakeState } from "@/lib/snake-engine";
import { audio } from "@/lib/audio";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  attemptNumber: number;
  attemptsRemaining: number;
  onGameOver: (result: { score: number; foods: number; durationMs: number }) => void;
};

export function SnakeGame({ attemptNumber, attemptsRemaining, onGameOver }: Props) {
  const [, force] = useState(0);
  const stateRef = useRef<SnakeState>(createState(Date.now()));
  const [phase, setPhase] = useState<"startup" | "countdown" | "playing" | "over" | "awaiting-continue" | "submitting">("startup");
  const [count, setCount] = useState(3);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(audio.enabled);

  const toggleSound = () => {
    audio.enabled = !audio.enabled;
    setSoundEnabled(audio.enabled);
    if (audio.enabled) audio.init();
  };

  useEffect(() => {
    audio.init();
  }, []);

  // Startup: 90s SNAKE -> READY -> Countdown
  useEffect(() => {
    if (phase !== "startup") return;
    
    // Play startup sound after a short delay
    const initTimer = setTimeout(() => {
      audio.startup();
    }, 500);

    const timer = setTimeout(() => {
      setPhase("countdown");
    }, 2000);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(timer);
    };
  }, [phase]);

  // Countdown: 3 - 2 - 1 - GO
  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 0) {
          clearInterval(id);
          setPhase("playing");
          return 0;
        }
        return c - 1;
      });
    }, 750);
    return () => clearInterval(id);
  }, [phase]);

  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    startedAt.current = performance.now();
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += now - last;
      last = now;
      const s = stateRef.current;
      const tick = tickFor(s);
      let guard = 0;
      while (acc >= tick && !s.over && guard++ < 4) {
        acc -= tick;
        const previousScore = s.score;
        const ate = step(s);
        if (ate) {
          if (s.score > previousScore && s.score % 500 === 0 && previousScore > 0) {
            audio.milestone();
          } else {
            audio.eat();
          }
        }
      }
      if (s.over && !finished.current) {
        finished.current = true;
        cancelAnimationFrame(raf);
        audio.die();
        setPhase("over");
        
        // Wait briefly before allowing the user to press any key
        setTimeout(() => {
          setPhase("awaiting-continue");
        }, 1200);
      }
      force((n) => n + 1);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const triggerGameOverTransition = useCallback(() => {
    setPhase("submitting");
    if (phase !== "awaiting-continue") return;
    audio.uiClick();
    const s = stateRef.current;
    onGameOver({
      score: s.score,
      foods: s.foods,
      durationMs: Math.round(performance.now() - startedAt.current),
    });
  }, [phase, onGameOver]);

  const input = useCallback((dir: Dir) => {
    if (phase === "awaiting-continue") {
      triggerGameOverTransition();
      return;
    }
    if (phase !== "playing") return;
    if (stateRef.current.over) return;
    audio.buttonClick();
    turn(stateRef.current, dir);
  }, [phase, triggerGameOverTransition]);

  // Keyboard
  useEffect(() => {
    const keys: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      a: "left",
      s: "down",
      d: "right",
      W: "up",
      A: "left",
      S: "down",
      D: "right",
    };
    const onKey = (e: KeyboardEvent) => {
      if (phase === "awaiting-continue") {
        e.preventDefault();
        triggerGameOverTransition();
        return;
      }
      
      const dir = keys[e.key];
      if (!dir) return;
      e.preventDefault();
      input(dir);
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [input, phase, triggerGameOverTransition]);

  // Swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (phase === "awaiting-continue") {
      e.preventDefault();
      triggerGameOverTransition();
      return;
    }
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (phase === "awaiting-continue") return;
    e.preventDefault();
    const start = touch.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    touch.current = { x: t.clientX, y: t.clientY };
  };

  const overlay: Overlay =
    phase === "startup"
      ? { lines: ["90s SNAKE", "", "READY"] }
      : phase === "countdown"
        ? { big: count === 0 ? "GO" : String(count), lines: [] }
        : phase === "over" || phase === "awaiting-continue" || phase === "submitting"
          ? { lines: ["GAME OVER", "", "SCORE", String(stateRef.current.score), "", (phase === "awaiting-continue" || phase === "submitting") ? (phase === "submitting" ? "LOADING..." : "PRESS ANY KEY") : ""] }
          : null;

  return (
    <div className="no-touch-scroll flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-[320px] items-center justify-between text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>Attempt {attemptNumber} of 3</span>
        <span>Attempts remaining: {attemptsRemaining}</span>
      </div>

      {/* 90s Phone Frame */}
      <div className="relative mx-auto w-full max-w-[320px] rounded-[2rem] bg-zinc-900 p-4 pb-8 shadow-2xl border-4 border-zinc-800">
        {/* Speaker */}
        <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-black shadow-inner"></div>
        
        {/* Screen Bezel */}
        <div className="rounded-lg bg-zinc-950 p-3 shadow-inner ring-1 ring-zinc-800 ring-offset-1 ring-offset-zinc-900">
          <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} className="w-full cursor-pointer">
            <LcdScreen state={stateRef.current} overlay={overlay} className="shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
          </div>
        </div>

        {/* Brand / Details */}
        <div className="mt-4 flex items-center justify-between px-2">
          <span className="text-[9px] font-bold tracking-widest text-zinc-500">CLASSIC</span>
          <button 
            type="button"
            onClick={toggleSound}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>

        {/* Physical-style D-Pad */}
                <div className="mt-8 grid grid-cols-3 grid-rows-3 gap-2 select-none px-6">
          <div />
          <PadButton label="▲" onPress={() => input("up")} />
          <div />
          <PadButton label="◀" onPress={() => input("left")} />
          <div className="flex items-center justify-center">
             <div className="h-4 w-4 rounded-full bg-zinc-800 shadow-inner" />
          </div>
          <PadButton label="▶" onPress={() => input("right")} />
          <div />
          <PadButton label="▼" onPress={() => input("down")} />
          <div />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Use arrows, WASD, or tap the keypad
      </p>
    </div>
  );
}

function PadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="flex h-12 w-full items-center justify-center rounded-lg border-b-4 border-zinc-950 bg-zinc-800 text-sm text-zinc-400 active:translate-y-1 active:border-b-0 active:mt-1 shadow-md"
    >
      {label}
    </button>
  );
}
