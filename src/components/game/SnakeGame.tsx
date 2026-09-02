import { useCallback, useEffect, useRef, useState } from "react";
import { LcdScreen, type Overlay } from "@/components/LcdScreen";
import { NokiaFrame } from "@/components/NokiaFrame";
import { createState, step, tickFor, turn, type Dir, type SnakeState } from "@/lib/snake-engine";
import { audio } from "@/lib/audio";
import { useServerFn } from "@tanstack/react-start";
import { syncCheckpoint } from "@/lib/api.functions";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  sessionToken: string;
  initialCheckpoint: string;
  attemptNumber: number;
  onGameOver: (result: { score: number; foods: number; durationMs: number; checkpoint: string }) => void;
  /** Bails out of the current attempt (no score submitted) back to the ready screen. */
  onAbort?: (() => void) | undefined;
};

export function SnakeGame({ sessionToken, initialCheckpoint, attemptNumber, onGameOver, onAbort }: Props) {
  const [, force] = useState(0);
  const stateRef = useRef<SnakeState>(createState(Date.now()));
  const [phase, setPhase] = useState<"startup" | "countdown" | "playing" | "over" | "awaiting-continue" | "submitting">("startup");
  const [count, setCount] = useState(3);
  const startedAt = useRef(0);
  const fnSync = useServerFn(syncCheckpoint);
  const lastSyncRef = useRef<{ foods: number; token: string }>({ foods: 0, token: initialCheckpoint });
  const isSyncingRef = useRef(false);
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
      checkpoint: lastSyncRef.current.token,
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

  // The phone's OK/select key: only ever meaningful once game-over is
  // awaiting acknowledgement — must not fire triggerGameOverTransition
  // unguarded, since that forces phase to "submitting" regardless of phase.
  const handleSelect = useCallback(() => {
    if (phase === "awaiting-continue") triggerGameOverTransition();
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


  const s = stateRef.current;
  const overlay: Overlay =
    phase === "startup"
      ? { lines: ["90s SNAKE"] }
      : phase === "countdown"
        ? { lines: [count > 0 ? String(count) : "GO!"] }
        : phase === "over"
          ? { lines: ["GAME OVER"] }
          : phase === "awaiting-continue"
            ? { lines: ["GAME OVER", "PRESS ANY KEY"] }
            : null;

  return (
    <div
      className="mx-auto w-full max-w-[360px] touch-none select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <NokiaFrame
        onDirection={input}
        onSelect={handleSelect}
        onPlay={phase === "awaiting-continue" ? triggerGameOverTransition : undefined}
        onReset={onAbort}
        topContent={
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span className="font-mono tabular-nums">SCORE {s.score.toLocaleString()}</span>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}
              className="rounded p-1 hover:bg-accent"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        }
      >
        <LcdScreen state={s} overlay={overlay} stretch />
        {phase === "awaiting-continue" && (
          <button
            type="button"
            onClick={triggerGameOverTransition}
            className="absolute bottom-[10%] left-1/2 -translate-x-1/2 rounded bg-[#1b2411] px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#9ead86]"
          >
            Continue
          </button>
        )}
      </NokiaFrame>

      <div className="mt-4 text-center pixel text-[10px] text-muted-foreground sm:text-[12px]">
        <span className="hidden sm:inline">ARROW KEYS / D-PAD · MOVE</span>
        <span className="sm:hidden">SWIPE OR TAP D-PAD</span>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Attempt {attemptNumber}
      </p>
    </div>
  );
}
