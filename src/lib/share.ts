import { BRAND } from "./config";

export function challengeUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/challenge/${code}`;
}

export function scoreShareText(score: number, percentile: number, url: string) {
  return `🐍 I scored ${score.toLocaleString()} on the ${BRAND.name}.\n\nApparently I'm better than ${percentile}% of players.\n\nCan you beat me?\n\n${url}`;
}

export function challengeShareText(score: number, url: string) {
  return `😂 I scored ${score.toLocaleString()} on ${BRAND.short}.\n\nI challenge you to beat me.\n\n${url}`;
}

export async function nativeShare(text: string, url: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: BRAND.name, text, url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const telegramUrl = (text: string, url: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
export const xUrl = (text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
