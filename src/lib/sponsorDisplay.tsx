import { useState } from "react";
import { nextWholeDollarAbove } from "@/lib/config";
import { normalizeSponsorLink } from "@/lib/sponsorLink";
import { cn } from "@/lib/utils";

export function domainFor(url: string): string {
  try {
    const host = new URL(normalizeSponsorLink(url)).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconFor(url: string): string | null {
  try {
    const host = new URL(normalizeSponsorLink(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

export function rankBadge(rank: number) {
  return (
    <span
      className={cn(
        "font-mono text-xs font-bold",
        rank === 1
          ? "text-primary"
          : rank === 2
            ? "text-primary/70"
            : rank === 3
              ? "text-primary/50"
              : "text-muted-foreground",
      )}
    >
      #{rank}
    </span>
  );
}

// Deep / medium / light green — same brand green at descending intensity,
// so the podium reads clearly without leaving the site's palette. Shared
// between the sponsor ladder's own rows and the homepage's compact
// "Top Advertisers" column so both podiums look like the same system.
export const TIER_ROW_CLASS: Record<number, string> = {
  1: "border border-primary bg-primary/25 shadow-[0_0_24px_-6px] shadow-primary/70 hover:bg-primary/30",
  2: "border border-primary/65 bg-primary/15 shadow-[0_0_20px_-8px] shadow-primary/45 hover:bg-primary/19",
  3: "border border-primary/40 bg-primary/8 shadow-[0_0_18px_-8px] shadow-primary/28 hover:bg-primary/11",
};
export const TIER_AVATAR_BORDER: Record<number, string> = {
  1: "border-primary",
  2: "border-primary/55",
  3: "border-primary/32",
};

/** Compact read-only row for the homepage's "Top Advertisers" column — no tagline/category/clicks, just rank, brand, and bid. */
export function AdvertiserRow({
  rank,
  linkUrl,
  amount,
  onOpen,
}: {
  rank: number;
  linkUrl: string;
  amount: number;
  onOpen: () => void;
}) {
  const domain = domainFor(linkUrl);
  const favicon = faviconFor(linkUrl);
  const [faviconFailed, setFaviconFailed] = useState(false);

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase group-hover:block"
      >
        Claim this rank for ${nextWholeDollarAbove(amount).toLocaleString()}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-2.5 rounded p-2 text-sm transition-colors",
          TIER_ROW_CLASS[rank] ?? "border border-border/50 hover:border-primary",
        )}
      >
        <span className="flex w-6 shrink-0 justify-center">{rankBadge(rank)}</span>
        {favicon && !faviconFailed ? (
          <img
            src={favicon}
            alt=""
            className={cn("h-6 w-6 shrink-0 rounded border object-cover", TIER_AVATAR_BORDER[rank] ?? "border-border")}
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-secondary text-[10px] font-bold text-primary",
              TIER_AVATAR_BORDER[rank] ?? "border-border",
            )}
          >
            {domain.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left font-bold">{domain}</span>
        <span className="shrink-0 font-mono text-xs font-bold text-primary">${amount.toLocaleString()}</span>
      </button>
    </li>
  );
}
