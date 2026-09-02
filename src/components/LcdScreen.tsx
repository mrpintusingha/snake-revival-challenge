import { useEffect, useRef } from "react";
import { COLS, ROWS, type SnakeState } from "@/lib/snake-engine";
import { cn } from "@/lib/utils";

export type Overlay = { lines: string[] } | null;

type Props = {
  state: SnakeState;
  overlay?: Overlay;
  className?: string;
  /** Fill the parent box exactly instead of keeping the native COLS:ROWS aspect ratio. */
  stretch?: boolean;
  /** Band position for the overlay text — "top" leaves the lower screen clear for art underneath. */
  overlayAlign?: "center" | "top";
};

const CELL = 12;
const PAD = 6;
const W = COLS * CELL + PAD * 2;
const H = ROWS * CELL + PAD * 2;

/** Monochrome LCD renderer shared by the teaser and the official game. */
export function LcdScreen({ state, overlay = null, className, stretch = false, overlayAlign = "center" }: Props) {
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

    // Full-cell fill (no gap) so adjacent segments merge into one
    // continuous body, like the original handset's snake.
    ctx.fillStyle = fg;
    for (const seg of state.snake) {
      ctx.fillRect(PAD + seg.x * CELL, PAD + seg.y * CELL, CELL, CELL);
    }

    // Food is a small static dot, distinctly smaller than the body — no blink.
    ctx.fillRect(PAD + state.food.x * CELL + 4, PAD + state.food.y * CELL + 4, CELL - 8, CELL - 8);

    if (overlay && overlay.lines.length) {
      const bandH = 52 * overlay.lines.length;
      const bandY = overlayAlign === "top" ? 0 : H / 2 - bandH / 2;
      const centerY = bandY + bandH / 2;
      ctx.fillStyle = "rgba(158,173,134,0.85)";
      ctx.fillRect(0, bandY, W, bandH);
      ctx.fillStyle = fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 13px ui-monospace, monospace";
      overlay.lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, centerY + (i - (overlay.lines.length - 1) / 2) * 18);
      });
    }
  });

  return (
    <canvas
      ref={canvasRef}
      aria-label="Snake game screen"
      className={cn(
        stretch ? "block h-full w-full" : "block h-auto w-full",
        "[image-rendering:pixelated]",
        className,
      )}
      style={stretch ? undefined : { aspectRatio: `${W} / ${H}` }}
    />
  );
}
