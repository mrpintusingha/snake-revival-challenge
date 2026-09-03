import { BRAND } from "./config";

export type ScoreCardData = {
  score: number;
  rank: number;
  nickname: string;
  tier: string;
};

/** Draws the shareable score card onto any 1080x1080 canvas 2D context. */
export function renderScoreCard(ctx: CanvasRenderingContext2D, data: ScoreCardData, colors?: { bg: string; ink: string }) {
  const S = 1080;
  const bg = colors?.bg ?? "#9ab857";
  const ink = colors?.ink ?? "#20301a";

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
  ctx.fillText(data.score.toLocaleString(), S / 2, 520);

  ctx.font = "bold 52px monospace";
  ctx.fillText(`GLOBAL #${data.rank}`, S / 2, 610);

  ctx.font = "40px monospace";
  ctx.fillText(`${data.nickname.toUpperCase()} — ${data.tier.toUpperCase()}`, S / 2, 690);

  ctx.font = "bold 64px monospace";
  ctx.fillText("BEAT MY SCORE", S / 2, 840);

  ctx.font = "34px monospace";
  ctx.fillText(typeof window !== "undefined" ? window.location.host : BRAND.short, S / 2, 950);
}

/** Renders the score card to an offscreen canvas and resolves it as a PNG blob, for the Web Share API's file-sharing path. */
export function generateScoreCardBlob(data: ScoreCardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  renderScoreCard(ctx, data);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
