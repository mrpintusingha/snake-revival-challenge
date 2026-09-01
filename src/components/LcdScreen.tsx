import { useEffect, useRef } from "react";
import { COLS, ROWS, type SnakeState } from "@/lib/snake-engine";
import { cn } from "@/lib/utils";

export type Overlay = { lines: string[] } | null;

type Props = {
  state: SnakeState;
  overlay?: Overlay;
  className?: string;
};

const CELL = 12;
const PAD = 6;
const W = COLS * CELL + PAD * 2;
const H = ROWS * CELL + PAD * 2;

/** Monochrome LCD renderer shared by the teaser and the official game. */
export function LcdScreen({ state, overlay = null, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = "#9ead86";
    const fg = "#1b2411";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = fg;
    for (const seg of state.snake) {
      ctx.fillRect(PAD + seg.x * CELL + 1, PAD + seg.y * CELL + 1, CELL - 2, CELL - 2);
    }

    // Food blinks like the original handset.
    if (Math.floor(Date.now() / 250) % 2 === 0) {
      ctx.fillRect(PAD + state.food.x * CELL + 3, PAD + state.food.y * CELL + 3, CELL - 6, CELL - 6);
    }

    if (overlay && overlay.lines.length) {
      ctx.fillStyle = "rgba(158,173,134,0.85)";
      ctx.fillRect(0, H / 2 - 26 * overlay.lines.length, W, 52 * overlay.lines.length);
      ctx.fillStyle = fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 13px ui-monospace, monospace";
      overlay.lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, H / 2 + (i - (overlay.lines.length - 1) / 2) * 18);
      });
    }
  });

  return (
    <canvas
      ref={canvasRef}
      aria-label="Snake game screen"
      className={cn("block h-auto w-full [image-rendering:pixelated]", className)}
      style={{ aspectRatio: `${W} / ${H}` }}
    />
  );
}
