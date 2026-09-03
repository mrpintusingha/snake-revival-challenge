import { BRAND } from "./config";

export function challengeUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/challenge/${code}`;
}

export function scoreShareText(score: number, percentile: number, url: string) {
  return `I just scored ${score.toLocaleString()} on 90s Snake. Can you beat me?\n\n${url}`;
}

export function challengeShareText(score: number, url: string) {
  return `I just scored ${score.toLocaleString()} on 90s Snake. Can you beat me?\n\n${url}`;
}

export async function nativeShare(text: string, url: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "90s Snake", text, url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Shares a file (e.g. the score card image) through the OS-native share
 * sheet — the only way a website can put Instagram (or any app without a
 * public web share-intent URL) in front of the user. Feature-detected:
 * most desktop browsers don't support file sharing, so callers should fall
 * back to a plain download when this returns false.
 */
export async function nativeShareFile(file: File, text: string, url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare?.({ files: [file] })) {
    return false;
  }
  try {
    await navigator.share({ title: "90s Snake", text, url, files: [file] });
    return true;
  } catch {
    return false;
  }
}

export const facebookUrl = (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
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
