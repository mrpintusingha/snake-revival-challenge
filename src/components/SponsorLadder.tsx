import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT } from "@/lib/config";
import { track } from "@/lib/analytics";
import { claimSponsorRank, getSponsorStandings, recordSponsorClick } from "@/lib/api.functions";

type Standing = {
  id: string;
  link_url: string;
  category: string;
  tagline: string;
  amount: number;
  click_count: number;
  created_at: string;
};

function faviconFor(url: string): string | null {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function SponsorLadder() {
  const [linkUrl, setLinkUrl] = useState("");
  const [category, setCategory] = useState<string>(SPONSOR_CATEGORIES[0]);
  const [tagline, setTagline] = useState("");
  const [amount, setAmount] = useState(SPONSOR_MIN_INCREMENT);
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const fnClaim = useServerFn(claimSponsorRank);
  const fnClick = useServerFn(recordSponsorClick);

  const { data, refetch } = useQuery({
    queryKey: ["sponsor-standings"],
    queryFn: () => getSponsorStandings() as Promise<Standing[]>,
    staleTime: 10000,
    refetchInterval: 20000,
  });

  const standings = data ?? [];
  const topAmount = standings[0]?.amount ?? 0;
  const floorAmount = topAmount + SPONSOR_MIN_INCREMENT;
  const effectiveAmount = amountTouched ? Math.max(amount, floorAmount) : floorAmount;

  const claim = async (targetAmount: number) => {
    if (linkUrl.trim().length < 4) {
      toast.error("Add your URL or @handle first");
      return;
    }
    if (tagline.trim().length < 4) {
      toast.error("Add a short tagline");
      return;
    }
    setBusy(true);
    track("sponsor_claim_clicked", { amount: targetAmount });
    try {
      const res = await fnClaim({
        data: {
          linkUrl: linkUrl.trim(),
          category,
          tagline: tagline.trim(),
          amount: targetAmount,
          returnUrl: `${window.location.origin}/`,
        },
      });
      if (res.mode === "redirect") {
        window.location.href = res.url;
        return;
      }
      toast.success("You're #1 — claim confirmed (test mode)");
      track("sponsor_claim_completed", { mode: "test" });
      setLinkUrl("");
      setTagline("");
      setAmountTouched(false);
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place your claim");
    } finally {
      setBusy(false);
    }
  };

  const onClickListing = (s: Standing) => {
    void fnClick({ data: { bidId: s.id } });
    track("sponsor_listing_clicked", { bidId: s.id });
  };

  return (
    <section className="w-full">
      <h2 className="pixel text-[11px] text-primary sm:text-sm">OUTBID FOR #1</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Pay to rank. Anyone can outbid the top spot for at least ${SPONSOR_MIN_INCREMENT} more.
      </p>

      <div className="mt-4 space-y-3 rounded border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest text-muted-foreground uppercase">Claim #1 for</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAmountTouched(true);
                setAmount((a) => Math.max(floorAmount, (amountTouched ? a : floorAmount) - 1));
              }}
              className="h-6 w-6 rounded-full border border-border text-xs hover:bg-accent"
              aria-label="Decrease amount"
            >
              −
            </button>
            <span className="font-mono text-lg font-bold text-primary tabular-nums">
              ${effectiveAmount.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => {
                setAmountTouched(true);
                setAmount((amountTouched ? amount : floorAmount) + 1);
              }}
              className="h-6 w-6 rounded-full border border-border text-xs hover:bg-accent"
              aria-label="Increase amount"
            >
              +
            </button>
          </div>
        </div>

        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Your product URL or @handle"
          className="w-full rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={80}
          placeholder="One-line tagline"
          className="w-full rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          {SPONSOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busy}
          onClick={() => void claim(effectiveAmount)}
          className="w-full rounded bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase disabled:opacity-60 hover:opacity-90"
        >
          {busy ? "One moment…" : "Claim rank"}
        </button>
      </div>

      <ol className="mt-4 space-y-2">
        {standings.map((s, i) => {
          const claimPrice = s.amount + SPONSOR_MIN_INCREMENT;
          const favicon = faviconFor(s.link_url);
          return (
            <li key={s.id} className="group relative">
              <button
                type="button"
                onClick={() => {
                  setAmount(claimPrice);
                  setAmountTouched(true);
                }}
                className="absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase group-hover:block"
              >
                Claim this rank for ${claimPrice.toLocaleString()}
              </button>
              <a
                href={s.link_url.startsWith("http") ? s.link_url : `https://${s.link_url}`}
                target="_blank"
                rel="noopener sponsored"
                onClick={() => onClickListing(s)}
                className="flex items-start gap-3 rounded border border-border p-3 text-sm hover:border-primary"
              >
                <span className="w-6 shrink-0 pt-0.5 text-left font-mono font-bold text-primary">#{i + 1}</span>
                {favicon ? (
                  <img src={favicon} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
                ) : (
                  <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-secondary" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{s.link_url}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.tagline}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                    <span>{s.category}</span>
                    <span>·</span>
                    <span>{s.click_count.toLocaleString()} clicks</span>
                    <span>·</span>
                    <span>{timeAgo(s.created_at)}</span>
                  </span>
                </span>
                <span className="shrink-0 font-mono font-bold tabular-nums text-primary">
                  ${s.amount.toLocaleString()}
                </span>
              </a>
            </li>
          );
        })}
        {!standings.length && (
          <li className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Be the first sponsor. Claim #1 for just ${SPONSOR_MIN_INCREMENT}.
          </li>
        )}
      </ol>
    </section>
  );
}
