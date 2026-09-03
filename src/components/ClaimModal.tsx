import { useEffect } from "react";
import { ChevronDown, Globe, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT } from "@/lib/config";
import { domainFor, faviconFor } from "@/lib/sponsorDisplay";
import { useSponsorClaimForm } from "@/hooks/useSponsorClaimForm";

export type ClaimModalTarget = {
  rank: number;
  /** Current amount held at this rank — the floor a new claim must clear. */
  amount: number;
  linkUrl: string;
};

/**
 * Opened from a "TOP RANKERS" row click — lets a sponsor claim that exact
 * rank (URL/handle, category, tagline, pre-filled bid) without scrolling to
 * the sidebar box. Shares its submission logic with SponsorLadder's own
 * claim box via useSponsorClaimForm so there's one claimSponsorRank call
 * site, not two hand-maintained copies.
 */
export function ClaimModal({
  target,
  onClose,
  onClaimed,
}: {
  target: ClaimModalTarget;
  onClose: () => void;
  onClaimed: () => void;
}) {
  const floorAmount = target.amount + SPONSOR_MIN_INCREMENT;
  const form = useSponsorClaimForm("all_time", floorAmount, () => {
    onClaimed();
    onClose();
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const holderDomain = domainFor(target.linkUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="neon-border w-full max-w-sm rounded bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="pixel text-[11px] text-primary sm:text-xs">CLAIM RANK #{target.rank}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently held by <span className="text-foreground">{holderDomain}</span> at $
              {target.amount.toLocaleString()} — outbid it to take #{target.rank}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-border p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 space-y-3 rounded border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold tracking-wide uppercase">Claim #{target.rank} for</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={form.decrement}
                className="h-6 w-6 shrink-0 rounded-full border border-border text-xs hover:bg-accent"
                aria-label="Decrease amount"
              >
                −
              </button>
              <span className="flex items-center gap-0.5 font-mono text-xl font-bold text-primary">
                $
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.amountTouched ? form.amount || "" : floorAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 7);
                    form.setAmountDigits(digits);
                  }}
                  onFocus={() => form.setToAmount(form.amountTouched ? form.amount : floorAmount)}
                  onBlur={form.blurAmount}
                  aria-label="Your bid amount"
                  style={{ width: `${Math.max(String(form.amountTouched ? form.amount || "" : floorAmount).length, 2)}ch` }}
                  className="bg-transparent tabular-nums outline-none"
                />
              </span>
              <button
                type="button"
                onClick={form.increment}
                className="h-6 w-6 shrink-0 rounded-full border border-border text-xs hover:bg-accent"
                aria-label="Increase amount"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="min-w-0 flex-[3]">
              <div className="relative">
                {faviconFor(form.linkUrl) && /\.[a-z]{2,}/i.test(form.linkUrl) ? (
                  <img
                    src={faviconFor(form.linkUrl)!}
                    alt=""
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 rounded-sm"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <Globe className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                )}
                <input
                  value={form.linkUrl}
                  onChange={(e) => form.setLinkUrl(e.target.value)}
                  placeholder="URL or @handle"
                  className="w-full rounded-full border border-input bg-secondary py-2 pr-9 pl-9 text-sm text-foreground outline-none focus:border-primary"
                />
                {form.previewLoading && (
                  <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
                )}
              </div>
              {form.preview?.title && (
                <p className="mt-1 truncate px-3 text-[10px] text-muted-foreground">
                  Fetched: <span className="text-foreground">{form.preview.title}</span>
                </p>
              )}
            </div>
            <div className="relative min-w-0 flex-[2]">
              <select
                value={form.category}
                onChange={(e) => form.setCategory(e.target.value)}
                className={cn(
                  "w-full appearance-none rounded-full border border-input bg-secondary py-2 pr-8 pl-3.5 text-sm outline-none focus:border-primary",
                  form.category ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <option value="" disabled>
                  Choose a Category
                </option>
                {SPONSOR_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="text-foreground">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          <input
            value={form.tagline}
            onChange={(e) => form.setTagline(e.target.value)}
            maxLength={80}
            placeholder="One-line tagline"
            className="w-full rounded-full border border-input bg-secondary px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary"
          />

          <button
            type="button"
            disabled={form.busy}
            onClick={() => void form.claim(form.effectiveAmount)}
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase disabled:opacity-60 hover:opacity-90"
          >
            {form.busy ? "One moment…" : `Claim Rank #${target.rank}`}
          </button>
        </div>
      </div>
    </div>
  );
}
