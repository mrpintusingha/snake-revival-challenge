import { ReactNode } from "react";
import type { Dir } from "@/lib/snake-engine";

export function NokiaFrame({
  children,
  topContent,
  onDirection,
  onSelect,
  onPlay,
  onReset,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  /** Wires the D-pad's four arrows to the game. Omit for a decorative frame. */
  onDirection?: ((dir: Dir) => void) | undefined;
  /** Wires the D-pad's center key — used to continue past game over. */
  onSelect?: (() => void) | undefined;
  /** Left soft key. */
  onReset?: (() => void) | undefined;
  /** Right soft key. */
  onPlay?: (() => void) | undefined;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] select-none">
      {/* Ambient brand-colored glow behind the shell */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[50px] blur-[6px]"
        style={{ background: "radial-gradient(60% 55% at 50% 30%, oklch(0.84 0.19 130 / 0.3), transparent 70%)" }}
      />

      <div className="relative rounded-[34px] border border-border bg-gradient-to-b from-card via-background to-[oklch(0.1_0.01_150)] p-4 pt-[18px] pb-5 shadow-[0_1px_0_var(--border)_inset,0_0_0_1px_oklch(0.84_0.19_130_/_0.12),0_30px_70px_-16px_rgba(0,0,0,0.85)]">
        {/* Earpiece grille */}
        <div className="mb-4 flex justify-center gap-1">
          <span className="h-[3px] w-[22px] rounded-full bg-border" />
          <span className="h-[3px] w-[22px] rounded-full bg-border" />
        </div>

        {/* Screen — reuses the app's own lcd-panel/lcd-texture utilities */}
        <div className="lcd-panel overflow-hidden rounded-[10px]">
          <div className="lcd-texture relative flex aspect-[20/16] items-center justify-center">
            {children}
          </div>
        </div>

        {topContent && <div className="mt-2 px-1">{topContent}</div>}

        {/* Controls */}
        <div className="mt-5 flex items-center justify-center gap-[22px]">
          <SoftKey label="Reset" onPress={onReset}>
            ↺
          </SoftKey>
          <DPad onDirection={onDirection} onSelect={onSelect} />
          <SoftKey label="Play" onPress={onPlay}>
            ▶
          </SoftKey>
        </div>

        {/* Keypad, decorative */}
        <div className="mt-[18px] grid grid-cols-3 gap-2">
          {KEYPAD.map((k) => (
            <div key={k} className="rounded-[9px] border border-border bg-secondary py-2 text-center">
              <span className="font-lcd text-[17px] leading-none text-foreground">{k}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const KEYPAD = ["1", "2 abc", "3 def", "4 ghi", "5 jkl", "6 mno", "7 pqrs", "8 tuv", "9 wxyz", "*", "0", "#"];

function SoftKey({ label, onPress, children }: { label: string; onPress?: (() => void) | undefined; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={-1}
      onClick={() => onPress?.()}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[11px] text-primary active:bg-accent"
    >
      {children}
    </button>
  );
}

function DPad({
  onDirection,
  onSelect,
}: {
  onDirection?: ((dir: Dir) => void) | undefined;
  onSelect?: (() => void) | undefined;
}) {
  const press = (dir: Dir) => () => onDirection?.(dir);
  return (
    <div className="relative h-[84px] w-[84px] shrink-0 rounded-[22px] border border-border bg-gradient-to-b from-secondary to-card shadow-[0_4px_10px_-4px_rgba(0,0,0,0.6)]">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        <div />
        <Key label="Up" onPress={press("up")}>
          <Arrow dir="up" />
        </Key>
        <div />
        <Key label="Left" onPress={press("left")}>
          <Arrow dir="left" />
        </Key>
        <Key label="Select" onPress={() => onSelect?.()}>
          <span className="h-[26px] w-[26px] rounded-full border border-primary/50 bg-primary/15" />
        </Key>
        <Key label="Right" onPress={press("right")}>
          <Arrow dir="right" />
        </Key>
        <div />
        <Key label="Down" onPress={press("down")}>
          <Arrow dir="down" />
        </Key>
        <div />
      </div>
    </div>
  );
}

function Key({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} tabIndex={-1} onClick={onPress} className="flex items-center justify-center bg-transparent">
      {children}
    </button>
  );
}

function Arrow({ dir }: { dir: Dir }) {
  const rotate = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
