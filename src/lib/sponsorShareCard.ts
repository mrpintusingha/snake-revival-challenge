import { BRAND } from "./config";

export type SponsorShareCardData = {
  domain: string;
  tagline: string;
  category: string;
  rank: number;
  amount: number;
};

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    lines[maxLines - 1] = lines[maxLines - 1]!.replace(/\s*\S*$/, "…");
  }
  return lines;
}

/**
 * Draws the shareable "rank card" onto any 1080x1080 canvas 2D context —
 * pure Canvas 2D drawing, no external images (favicons load from a
 * third-party host with no reliable CORS headers, which would taint the
 * canvas and break Save/Copy). The domain's own first letter stands in for
 * a logo instead, same fallback the site already uses for a failed favicon.
 */
export function renderSponsorShareCard(ctx: CanvasRenderingContext2D, data: SponsorShareCardData) {
  const S = 1080;
  const bg = "#0f150c";
  const green = "#8ee000";
  const ink = "#e9f5d8";
  const dim = "#8a9b78";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Faint pixel grid, matching the site's own crt-grid texture.
  ctx.strokeStyle = green;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1;
  for (let x = 0; x <= S; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, S);
    ctx.stroke();
  }
  for (let y = 0; y <= S; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Outer frame.
  ctx.strokeStyle = green;
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, S - 72, S - 72);

  ctx.textBaseline = "alphabetic";

  // Top badge.
  ctx.textAlign = "left";
  ctx.fillStyle = green;
  ctx.font = "bold 32px monospace";
  ctx.fillText("🏆 OUTBID FOR #1", 90, 150);

  ctx.textAlign = "right";
  ctx.fillStyle = dim;
  ctx.font = "28px monospace";
  ctx.fillText(typeof window !== "undefined" ? window.location.host : BRAND.short, S - 90, 150);

  // Logo stand-in (first letter) + domain.
  const avatarX = 90;
  const avatarY = 260;
  const avatarSize = 130;
  ctx.fillStyle = "#16210f";
  ctx.strokeStyle = green;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = green;
  ctx.font = "bold 72px monospace";
  ctx.textAlign = "center";
  ctx.fillText(data.domain.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 26);

  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.font = "bold 56px monospace";
  const domainText = data.domain.length > 22 ? `${data.domain.slice(0, 21)}…` : data.domain;
  ctx.fillText(domainText, avatarX + avatarSize + 36, avatarY + 56);

  ctx.fillStyle = dim;
  ctx.font = "30px monospace";
  ctx.fillText(data.category.toUpperCase(), avatarX + avatarSize + 36, avatarY + 100);

  // Tagline, word-wrapped up to 2 lines.
  ctx.fillStyle = ink;
  ctx.font = "34px monospace";
  const taglineLines = wrapLines(ctx, data.tagline, S - 180, 2);
  taglineLines.forEach((line, i) => {
    ctx.fillText(line, 90, 480 + i * 48);
  });

  // Divider.
  ctx.strokeStyle = green;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 660);
  ctx.lineTo(S - 90, 660);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Rank (left) / bid amount (right) — the two headline numbers.
  ctx.textAlign = "left";
  ctx.fillStyle = dim;
  ctx.font = "28px monospace";
  ctx.fillText("BOARD RANK", 90, 730);
  ctx.fillStyle = green;
  ctx.font = "bold 140px monospace";
  ctx.fillText(`#${data.rank}`, 90, 880);

  ctx.textAlign = "right";
  ctx.fillStyle = dim;
  ctx.font = "28px monospace";
  ctx.fillText("CURRENT BID", S - 90, 730);
  ctx.fillStyle = ink;
  ctx.font = "bold 100px monospace";
  ctx.fillText(`$${data.amount.toLocaleString()}`, S - 90, 860);

  // Footer.
  ctx.textAlign = "center";
  ctx.fillStyle = dim;
  ctx.font = "26px monospace";
  ctx.fillText(`${BRAND.short.toUpperCase()} · PUBLIC SPONSOR LEADERBOARD`, S / 2, S - 70);
}

/** Renders the share card to an offscreen canvas and resolves it as a PNG blob. */
export function generateSponsorShareCardBlob(data: SponsorShareCardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  renderSponsorShareCard(ctx, data);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
