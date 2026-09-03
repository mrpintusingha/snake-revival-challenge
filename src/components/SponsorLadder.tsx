import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, Loader2, Trophy } from "lucide-react";
import { SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT } from "@/lib/config";
import { track } from "@/lib/analytics";
import { claimSponsorRank, getHomeData, getSponsorStandings, recordSponsorClick } from "@/lib/api.functions";

type Standing = {
  id: string;
  link_url: string;
  category: string;
  tagline: string;
  amount: number;
  click_count: number;
  created_at: string;
};

type ActivityRow = { id: string; event_type: string; metadata: Record<string, unknown>; created_at: string };

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

/** Human line for a real `activity_events` row — no sponsor bid history exists, so this stays about play, not bidding. */
function activityLine(row: ActivityRow): string {
  const name = (row.metadata?.["nickname"] as string) ?? "A player";
  switch (row.event_type) {
    case "score": {
      const score = Number(row.metadata?.["score"] ?? 0);
      return `${name} scored ${score.toLocaleString()}`;
    }
    case "top100":
      return `${name} broke into the top 100`;
    case "challenge":
      return `${name} sent a friend challenge`;
    default:
      return `${name} made a move`;
  }
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

  // Same query key as the homepage's own getHomeData() call — React Query
  // dedupes this, so the live-activity feed below rides along for free.
  const { data: home } = useQuery({ queryKey: ["home"], queryFn: () => getHomeData(), staleTime: 30000 });
  const activity = ((home?.activity ?? []) as ActivityRow[]).slice(0, 5);

  const standings = data ?? [];
  const champion = standings[0] ?? null;
  const rest = standings.slice(1);
  const topAmount = champion?.amount ?? 0;
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
    <section id="sponsor" className="neon-border w-full rounded p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="pixel text-[11px] text-primary sm:text-sm">OUTBID FOR #1</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground uppercase tracking-wide">Your brand could own this screen.</p>

      {/* Champion card */}
      <div className="neon-border-gold mt-4 rounded p-4 text-center">
        <Crown className="mx-auto h-6 w-6 text-[oklch(0.83_0.15_85)]" aria-hidden />
        <p className="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">#1 Champion</p>
        {champion ? (
          <>
            <p className="mt-1 truncate font-bold text-primary">{champion.link_url}</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
              ${champion.amount.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">Current screen owner</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm font-bold text-foreground">Be the first champion</p>
            <p className="mt-1 text-xs text-muted-foreground">Claim #1 for just ${SPONSOR_MIN_INCREMENT}</p>
          </>
        )}
      </div>

      {/* Bid box */}
      <div className="mt-4 space-y-3 rounded border border-border p-4">
        <div className="flex items-center justify-between text-xs tracking-widest text-muted-foreground uppercase">
          <span>Current bid</span>
          <span className="font-mono font-bold text-foreground">${topAmount.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest text-muted-foreground uppercase">Your bid</span>
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

        <p className="text-center text-[10px] font-bold tracking-widest text-primary uppercase">🏆 You will be #1</p>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[9px] tracking-widest text-muted-foreground uppercase">Listing details</p>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Your product URL or @handle"
            className="w-full rounded border border-input bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          />
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={80}
            placeholder="One-line tagline"
            className="w-full rounded border border-input bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-input bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          >
            {SPONSOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void claim(effectiveAmount)}
          className="w-full rounded bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase disabled:opacity-60 hover:opacity-90"
        >
          {busy ? "One moment…" : "Take #1 — Outbid them"}
        </button>
      </div>

      {/* Live activity — real activity_events, not fabricated sponsor history */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] tracking-widest text-muted-foreground uppercase">Live activity</h3>
          <span className="flex items-center gap-1 text-[9px] tracking-widest text-primary/70 uppercase">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Refreshing live
          </span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {activity.map((row) => (
            <li key={row.id} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{activityLine(row)}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground/70">{timeAgo(row.created_at)}</span>
            </li>
          ))}
          {!activity.length && <li className="text-xs text-muted-foreground">No activity yet — be the first to play.</li>}
        </ul>
      </div>

      {/* Ranks #2 and below */}
      {rest.length > 0 && (
        <ol className="mt-5 space-y-2">
          {rest.map((s, i) => {
            const rank = i + 2;
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
                  className="flex items-center gap-3 rounded border border-border p-2.5 text-sm hover:border-primary"
                >
                  <span className="w-6 shrink-0 text-left font-mono font-bold text-primary">#{rank}</span>
                  {favicon ? (
                    <img src={favicon} alt="" className="h-6 w-6 shrink-0 rounded-full" />
                  ) : (
                    <span className="h-6 w-6 shrink-0 rounded-full bg-secondary" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{s.link_url}</span>
                    <span className="block truncate text-[10px] tracking-wide text-muted-foreground uppercase">
                      {s.category} · {s.click_count.toLocaleString()} clicks · {timeAgo(s.created_at)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono font-bold tabular-nums text-primary">
                    ${s.amount.toLocaleString()}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
