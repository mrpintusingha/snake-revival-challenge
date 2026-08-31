import { useEffect, useRef } from "react";
import { BRAND } from "@/lib/config";

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
    const S = 1080;
    canvas.width = S;
    canvas.height = S;

    const styles = getComputedStyle(canvas);
    const bg = styles.getPropertyValue("--lcd").trim() || "#9ab857";
    const ink = styles.getPropertyValue("--lcd-ink").trim() || "#20301a";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    // pixel grid texture
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.05;
    for (let y = 0; y < S; y += 6) ctx.fillRect(0, y, S, 2);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, S - 80, S - 80);

    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.font = "bold 44px monospace";
    ctx.fillText("90s SNAKE", S / 2, 160);

    ctx.font = "120px serif";
    ctx.fillText("🐍", S / 2, 320);

    ctx.font = "bold 190px monospace";
    ctx.fillText(score.toLocaleString(), S / 2, 520);

    ctx.font = "bold 52px monospace";
    ctx.fillText(`GLOBAL #${rank}`, S / 2, 610);

    ctx.font = "40px monospace";
    ctx.fillText(`${nickname.toUpperCase()} — ${tier.toUpperCase()}`, S / 2, 690);

    ctx.font = "bold 64px monospace";
    ctx.fillText("BEAT MY SCORE", S / 2, 840);

    ctx.font = "34px monospace";
    ctx.fillText(
      typeof window !== "undefined" ? window.location.host : BRAND.short,
      S / 2,
      950,
    );
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
