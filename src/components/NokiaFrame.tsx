import { ReactNode } from "react";
import type { Dir } from "@/lib/snake-engine";

const KEYPAD = ["1", "2 abc", "3 def", "4 ghi", "5 jkl", "6 mno", "7 pqrs", "8 tuv", "9 wxyz", "*", "0 +", "#"];

export function NokiaFrame({
  children,
  topContent,
  onDirection,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  /** Wires the phone's own D-pad to the game. Omit for a decorative frame. */
  onDirection?: (dir: Dir) => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] select-none">
      {topContent && <div className="mb-3">{topContent}</div>}
      <div
        className="relative rounded-[2.2rem] rounded-t-[2.6rem] p-3 pt-4 pb-4 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #f4f5f7 0%, #d6d9de 30%, #aeb3ba 60%, #8a9099 100%)",
          border: "2px solid #6b7178",
        }}
      >
        {/* Glossy highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 30%)" }}
        />

        {/* Earpiece grille */}
        <div className="relative mx-auto mb-2 flex h-2.5 w-16 items-center justify-center gap-[3px] rounded-full bg-[#3a3d42] shadow-inner">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-[#8a8f96]" />
          ))}
        </div>

        {/* Wordmark */}
        <p
          className="relative mb-2 text-center text-[11px] font-bold tracking-[0.15em] text-[#2b2d31]"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          NOKIA
        </p>

        {/* Screen */}
        <div className="relative rounded-md bg-[#1c1e21] p-1.5 shadow-inner ring-1 ring-black/50">
          <div className="rounded-sm bg-black p-1">{children}</div>
        </div>

        {/* Call / D-pad / End */}
        <div className="relative mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Call"
            tabIndex={-1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-md"
            style={{ background: "radial-gradient(circle at 35% 30%, #6fd66f, #1f9c3a 70%)" }}
          >
            <PhoneIcon />
          </button>

          <DPad onDirection={onDirection} />

          <button
            type="button"
            aria-label="End"
            tabIndex={-1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-md"
            style={{ background: "radial-gradient(circle at 35% 30%, #f07a7a, #c11f1f 70%)" }}
          >
            <PhoneIcon hangup />
          </button>
        </div>

        {/* Keypad */}
        <div
          className="relative mt-3 rounded-xl p-2.5"
          style={{ background: "linear-gradient(160deg, #2a2c30 0%, #17181b 100%)" }}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {KEYPAD.map((k) => {
              const [digit, letters] = k.split(" ");
              return (
                <div
                  key={k}
                  className="flex h-8 flex-col items-center justify-center rounded-md text-[#1f2124] shadow-[0_2px_0_rgba(0,0,0,0.4)]"
                  style={{ background: "linear-gradient(160deg, #d9dce1 0%, #a9adb4 100%)" }}
                >
                  <span className="text-[11px] font-bold leading-none">{digit}</span>
                  {letters && <span className="text-[6px] font-bold uppercase leading-none">{letters}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DPad({ onDirection }: { onDirection?: ((dir: Dir) => void) | undefined }) {
  const press = (dir: Dir) => () => onDirection?.(dir);
  const armClass =
    "absolute flex items-center justify-center text-[#2b2d31] active:bg-[#c7cbd1] disabled:pointer-events-none";
  return (
    <div
      className="relative h-14 w-14 shrink-0 rounded-full shadow-[0_2px_0_rgba(0,0,0,0.35)]"
      style={{ background: "linear-gradient(160deg, #e4e6e9 0%, #b9bdc3 100%)" }}
    >
      <div className="absolute inset-[6px] rounded-full ring-1 ring-black/10" />
      <button type="button" aria-label="Up" tabIndex={-1} onClick={press("up")} className={`${armClass} left-1/2 top-0 h-5 w-6 -translate-x-1/2 rounded-t-full`}>
        <Arrow dir="up" />
      </button>
      <button type="button" aria-label="Down" tabIndex={-1} onClick={press("down")} className={`${armClass} bottom-0 left-1/2 h-5 w-6 -translate-x-1/2 rounded-b-full`}>
        <Arrow dir="down" />
      </button>
      <button type="button" aria-label="Left" tabIndex={-1} onClick={press("left")} className={`${armClass} left-0 top-1/2 h-6 w-5 -translate-y-1/2 rounded-l-full`}>
        <Arrow dir="left" />
      </button>
      <button type="button" aria-label="Right" tabIndex={-1} onClick={press("right")} className={`${armClass} right-0 top-1/2 h-6 w-5 -translate-y-1/2 rounded-r-full`}>
        <Arrow dir="right" />
      </button>
      <div
        className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-inner"
        style={{ background: "linear-gradient(160deg, #f4f5f7 0%, #cfd2d7 100%)" }}
      />
    </div>
  );
}

function Arrow({ dir }: { dir: Dir }) {
  const rotate = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <path d="M4 0 L8 8 L0 8 Z" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon({ hangup = false }: { hangup?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ transform: hangup ? "rotate(135deg)" : undefined }}>
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}
