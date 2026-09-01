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


  return (
    /* Nokia 3310-style handset shell */
    <div className="relative mx-auto w-full max-w-[300px] scale-90 sm:scale-100 origin-top select-none">
      <div
        className="relative rounded-[3rem] rounded-t-[3.5rem] p-4 pt-5 pb-7 shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #6f7d94 0%, #4d5a70 45%, #3a4658 100%)",
          border: "3px solid #2c3542",
        }}
      >
        {/* subtle faceplate sheen */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%)" }}
        />

        {/* earpiece grille */}
        <div className="relative mx-auto mb-1.5 flex h-4 w-24 items-center justify-center gap-1 rounded-full bg-[#2c3542] shadow-inner">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="h-2 w-[3px] rounded-full bg-black/70" />
          ))}
        </div>

        {/* NOKIA wordmark */}
        <p className="relative mb-2 text-center text-[13px] font-bold tracking-[0.45em] text-[#e6ebf2]" style={{ fontFamily: "Arial, sans-serif" }}>
          NOKIA
        </p>

        {/* screen bezel */}
        <div className="relative rounded-[1.4rem] bg-[#20262e] p-2.5 shadow-inner ring-1 ring-black/60">
          <div className="rounded-[0.9rem] bg-[#14181d] p-2">
            <LcdScreen state={stateRef.current} overlay={overlay} className="rounded-[0.4rem] shadow-[inset_0_0_12px_rgba(0,0,0,0.55)]" />
          </div>
        </div>

        {/* Navi key + soft keys */}
        <div className="relative mt-4 px-2 opacity-90 pointer-events-none">
          <div className="flex items-center justify-between px-1">
            <div className="h-7 w-16 rounded-full bg-[#2c3542] shadow-md border-b-2 border-black/50" />
            <div className="h-7 w-16 rounded-full bg-[#2c3542] shadow-md border-b-2 border-black/50" />
          </div>
          {/* iconic blue oval Navi key */}
          <div className="mx-auto -mt-1 flex h-12 w-24 items-center justify-center rounded-[50%] bg-gradient-to-b from-[#3f6fb4] to-[#2a4f86] shadow-lg border-b-4 border-[#1d3a63]">
            <div className="h-6 w-12 rounded-[50%] bg-[#243340] shadow-inner" />
          </div>

          {/* number pad */}
          <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2 px-1 text-center text-[10px] font-bold text-[#e6ebf2]">
            {["1", "2 abc", "3 def", "4 ghi", "5 jkl", "6 mno", "7 pqrs", "8 tuv", "9 wxyz", "*", "0 +", "#"].map((k) => (
              <div key={k} className="flex h-7 items-center justify-center rounded-full bg-[#2c3542] shadow-md border-b-2 border-black/50">
                {k}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

}
