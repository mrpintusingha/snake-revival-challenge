import { useCallback, useEffect, useRef, useState } from "react";
import { LcdScreen, type Overlay } from "./LcdScreen";
import { createState, step, tickFor, turn, type Dir, type SnakeState } from "@/lib/snake-engine";

type Props = {
  attemptNumber: number;
  attemptsRemaining: number;
  onGameOver: (result: { score: number; foods: number; durationMs: number }) => void;
};

export function SnakeGame({ attemptNumber, attemptsRemaining, onGameOver }: Props) {
  const [, force] = useState(0);
  const stateRef = useRef<SnakeState>(createState(Date.now()));
  const [phase, setPhase] = useState<"countdown" | "playing" | "over">("countdown");
  const [count, setCount] = useState(3);
  const startedAt = useRef(0);
  const finished = useRef(false);

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
        step(s);
      }
      if (s.over && !finished.current) {
        finished.current = true;
        cancelAnimationFrame(raf);
        setPhase("over");
        onGameOver({
          score: s.score,
          foods: s.foods,
          durationMs: Math.round(now - startedAt.current),
        });
      }
      force((n) => n + 1);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, onGameOver]);

  const input = useCallback((dir: Dir) => {
    if (stateRef.current.over) return;
    turn(stateRef.current, dir);
  }, []);

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
      const dir = keys[e.key];
      if (!dir) return;
      e.preventDefault();
      input(dir);
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [input]);

  // Swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
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
    phase === "countdown"
      ? { big: count === 0 ? "GO" : String(count), lines: [] }
      : phase === "over"
        ? { lines: ["GAME OVER", `SCORE ${stateRef.current.score}`] }
        : null;

  return (
    <div className="no-touch-scroll flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-[420px] items-center justify-between text-[10px] tracking-widest text-muted-foreground uppercase">
        <span>Attempt {attemptNumber} of 3</span>
        <span>Attempts remaining: {attemptsRemaining}</span>
      </div>

      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} className="w-full max-w-[420px]">
        <LcdScreen state={stateRef.current} overlay={overlay} />
      </div>

      <p className="hidden text-center text-xs text-muted-foreground sm:block">
        Arrow keys or WASD
      </p>

      {/* Large touch pad — mobile first */}
      <div className="grid w-full max-w-[260px] grid-cols-3 grid-rows-3 gap-2 select-none sm:hidden">
        <div />
        <PadButton label="▲" onPress={() => input("up")} />
        <div />
        <PadButton label="◀" onPress={() => input("left")} />
        <div />
        <PadButton label="▶" onPress={() => input("right")} />
        <div />
        <PadButton label="▼" onPress={() => input("down")} />
        <div />
      </div>
      <p className="text-center text-xs text-muted-foreground sm:hidden">Swipe or tap to steer</p>
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
      className="flex h-16 items-center justify-center rounded border border-border bg-secondary text-lg text-foreground active:bg-accent"
    >
      {label}
    </button>
  );
}
