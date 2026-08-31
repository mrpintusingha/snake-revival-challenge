import { useEffect, useRef, useState } from "react";
import { LcdScreen, type Overlay } from "./LcdScreen";
import { autopilot, createState, step, tickFor, turn, type SnakeState } from "@/lib/snake-engine";

/**
 * Non-interactive ~8s nostalgia loop. Visitors cannot control the snake:
 * the first real game happens only after payment.
 */
export function SnakeTeaser() {
  const [, force] = useState(0);
  const stateRef = useRef<SnakeState>(createState(20250101));
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let endAt = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;

      if (endAt) {
        if (now >= endAt) {
          stateRef.current = createState(Math.floor(Math.random() * 1e9));
          setOverlay(null);
          endAt = 0;
        }
        force((n) => n + 1);
        return;
      }

      acc += dt;
      const s = stateRef.current;
      const tick = Math.max(90, tickFor(s));
      while (acc >= tick) {
        acc -= tick;
        turn(s, autopilot(s));
        step(s);
        if (s.over || s.foods >= 9) {
          setOverlay({ lines: ["WHO'S STILL GOT IT?"] });
          endAt = now + 2200;
          break;
        }
      }
      force((n) => n + 1);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <LcdScreen state={stateRef.current} overlay={overlay} />;
}
