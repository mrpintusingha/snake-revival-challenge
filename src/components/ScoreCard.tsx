import { useEffect, useRef } from "react";
import { renderScoreCard } from "@/lib/scoreCard";

/**
 * Square shareable score card, drawn on canvas so it can be saved and posted
 * to WhatsApp / Instagram Stories / X without any server-side image service.
 */
export function ScoreCard({
  score,
  rank,
  nickname,
  tier,
}: {
  score: number;
  rank: number;
  nickname: string;
  tier: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1080;

    const styles = getComputedStyle(canvas);
    const bg = styles.getPropertyValue("--lcd").trim() || "#9ab857";
    const ink = styles.getPropertyValue("--lcd-ink").trim() || "#20301a";

    renderScoreCard(ctx, { score, rank, nickname, tier }, { bg, ink });
  }, [score, rank, nickname, tier]);

  const download = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `90s-snake-${score}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <canvas ref={ref} className="lcd-panel w-full rounded-[3px]" aria-label="Shareable score card" />
      <button
        type="button"
        onClick={download}
        className="rounded border border-border px-4 py-3 text-sm tracking-wide uppercase hover:bg-accent"
      >
        Save score card
      </button>
    </div>
  );
}
