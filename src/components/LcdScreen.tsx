import { useEffect, useRef } from "react";
import { COLS, ROWS, type SnakeState } from "@/lib/snake-engine";

const CELL = 8; // logical pixels per grid cell
const HEADER = 14; // status strip height, like the old handset display
const PAD = 2;
const W = COLS * CELL + PAD * 2;
const H = ROWS * CELL + HEADER + PAD * 2;

export type Overlay = { lines: string[]; big?: string } | null;

/**
 * Monochrome LCD renderer. Deliberately primitive: solid blocks, one ink
 * colour, no gradients, no glow, no particles.
 */
export function LcdScreen({
  state,
  overlay,
  className,
}: {
  state: SnakeState | null;
  overlay?: Overlay;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const scale = Math.max(2, Math.round((canvas.clientWidth / W) * dpr));
    if (canvas.width !== W * scale) {
      canvas.width = W * scale;
      canvas.height = H * scale;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const bg = getComputedStyle(canvas).getPropertyValue("--lcd").trim() || "#9ab857";
    const ink = getComputedStyle(canvas).getPropertyValue("--lcd-ink").trim() || "#20301a";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ink;

    // Status strip
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, HEADER - 2, W, 1);
    ctx.globalAlpha = 1;
    ctx.font = "9px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("SNAKE", PAD + 1, PAD + 1);
    ctx.textAlign = "right";
    ctx.fillText(String(state?.score ?? 0).padStart(4, "0"), W - PAD - 1, PAD + 1);

    const ox = PAD;
    const oy = HEADER + PAD;

    if (state) {
      // Food: hollow blinking block, like the old "pellet"
      const blink = Math.floor(Date.now() / 250) % 2 === 0;
      if (blink || state.over) {
        ctx.fillRect(ox + state.food.x * CELL + 2, oy + state.food.y * CELL + 2, CELL - 4, CELL - 4);
      }
      // Snake: blocks with a 1px seam so segments read individually
      for (const seg of state.snake) {
        ctx.fillRect(ox + seg.x * CELL, oy + seg.y * CELL, CELL - 1, CELL - 1);
      }
    }

    if (overlay) {
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = bg;
      ctx.fillRect(0, HEADER, W, H - HEADER);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      let y = HEADER + (H - HEADER) / 2 - (overlay.big ? 14 : (overlay.lines.length - 1) * 6);
      if (overlay.big) {
        ctx.font = "bold 26px monospace";
        ctx.fillText(overlay.big, W / 2, y);
        y += 22;
      }
      ctx.font = "10px monospace";
      for (const line of overlay.lines) {
        ctx.fillText(line, W / 2, y);
        y += 12;
      }
    }
  });

  return (
    <canvas
      ref={ref}
      className={`lcd-panel lcd-texture block h-auto w-full max-w-[420px] rounded-[3px] ${className ?? ""}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      aria-label="Snake game display"
    />
  );
}

export const LCD_ASPECT = `${W} / ${H}`;
