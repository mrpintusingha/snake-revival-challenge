import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Coins,
  Crown,
  Cpu,
  Gamepad2,
  Globe,
  Loader2,
  Medal,
  Megaphone,
  Sparkles,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT } from "@/lib/config";
import { track } from "@/lib/analytics";
import { claimSponsorRank, getHomeData, getSponsorStandings, recordSponsorClick } from "@/lib/api.functions";

type Ladder = "all_time" | "daily";

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

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Apps & Tools": Wrench,
  "AI & Infrastructure": Cpu,
  Gaming: Gamepad2,
  Marketing: Megaphone,
  "Crypto & Web3": Coins,
  Other: Sparkles,
};

function domainFor(url: string): string {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

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

function rankBadge(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-[oklch(0.83_0.15_85)]" aria-hidden />;
  if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" aria-hidden />;
  if (rank === 3) return <Medal className="h-4 w-4 text-[oklch(0.7_0.12_55)]" aria-hidden />;
  return <span className="font-mono text-xs font-bold text-muted-foreground">#{rank}</span>;
}

function SponsorRow({
  rank,
  s,
  onOpen,
  onClaimHere,
}: {
  rank: number;
  s: Standing;
  onOpen: (s: Standing) => void;
  onClaimHere: () => void;
}) {
  const domain = domainFor(s.link_url);
  const favicon = faviconFor(s.link_url);
  const CategoryIcon = CATEGORY_ICON[s.category] ?? Sparkles;

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onClaimHere}
        className="absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase group-hover:block"
      >
        Claim this rank for ${(s.amount + SPONSOR_MIN_INCREMENT).toLocaleString()}
      </button>
      <a
        href={s.link_url.startsWith("http") ? s.link_url : `https://${s.link_url}`}
        target="_blank"
        rel="noopener sponsored"
        onClick={() => onOpen(s)}
        className="flex gap-3 rounded border border-border/60 p-3 text-sm hover:border-primary"
      >
        <span className="flex w-6 shrink-0 justify-center pt-1">{rankBadge(rank)}</span>
        {favicon ? (
          <img src={favicon} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-sm font-bold text-primary">
            {domain.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate font-bold">{domain}</span>
            <span className="shrink-0 font-mono font-bold tabular-nums text-primary">${s.amount.toLocaleString()}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{s.tagline}</span>
          <span className="mt-1 flex items-center gap-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
            <CategoryIcon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              {s.category} · {timeAgo(s.created_at)}
            </span>
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
            {s.click_count.toLocaleString()} clicks · See details
          </span>
        </span>
      </a>
    </li>
  );
}

export function SponsorLadder() {
  const [ladder, setLadder] = useState<Ladder>("all_time");
  const [linkUrl, setLinkUrl] = useState("");
  const [category, setCategory] = useState<string>(SPONSOR_CATEGORIES[0]);
  const [tagline, setTagline] = useState("");
  const [amount, setAmount] = useState(SPONSOR_MIN_INCREMENT);
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const fnClaim = useServerFn(claimSponsorRank);
  const fnClick = useServerFn(recordSponsorClick);

  const { data, refetch } = useQuery({
    queryKey: ["sponsor-standings", ladder],
    queryFn: () => getSponsorStandings({ data: { ladder } }) as Promise<Standing[]>,
    staleTime: 10000,
    refetchInterval: 20000,
  });

  // Same query key as the homepage's own getHomeData() call — React Query
  // dedupes this, so the live-activity feed below rides along for free.
  const { data: home } = useQuery({ queryKey: ["home"], queryFn: () => getHomeData(), staleTime: 30000 });
  const activity = ((home?.activity ?? []) as ActivityRow[]).slice(0, 5);

  const standings = data ?? [];
  const top3 = standings.slice(0, 3);
  const rest = standings.slice(3);
  const topAmount = standings[0]?.amount ?? 0;
  const floorAmount = topAmount + SPONSOR_MIN_INCREMENT;
  const effectiveAmount = amountTouched ? Math.max(amount, floorAmount) : floorAmount;

  const switchLadder = (next: Ladder) => {
    if (next === ladder) return;
    setLadder(next);
    setAmountTouched(false);
  };

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
    track("sponsor_claim_clicked", { amount: targetAmount, ladder });
    try {
      const res = await fnClaim({
        data: {
          linkUrl: linkUrl.trim(),
          category,
          tagline: tagline.trim(),
          amount: targetAmount,
          returnUrl: `${window.location.origin}/`,
          ladderType: ladder,
        },
      });
      if (res.mode === "redirect") {
        window.location.href = res.url;
        return;
      }
      toast.success("You're #1 — claim confirmed (test mode)");
      track("sponsor_claim_completed", { mode: "test", ladder });
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
    track("sponsor_listing_clicked", { bidId: s.id, ladder });
  };

  const claimHereFor = (s: Standing) => {
    setAmount(s.amount + SPONSOR_MIN_INCREMENT);
    setAmountTouched(true);
  };

  return (
    <section id="sponsor" className="neon-border w-full rounded p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="pixel text-[11px] text-primary sm:text-sm">OUTBID FOR #1</h2>
      </div>
      <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">Your brand could own this screen.</p>

      {/* All-time / Today toggle */}
      <div className="mt-4 flex rounded-full border border-border bg-secondary/40 p-1 text-[11px] font-bold tracking-wide uppercase">
        <button
          type="button"
          onClick={() => switchLadder("all_time")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 transition-colors",
            ladder === "all_time" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="h-3.5 w-3.5" aria-hidden /> All-time
        </button>
        <button
          type="button"
          onClick={() => switchLadder("daily")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 transition-colors",
            ladder === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden /> Today
        </button>
      </div>

      {/* Claim box */}
      <div className="mt-4 space-y-3 rounded border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-wide uppercase">Claim #1 for</span>
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
            <span className="font-mono text-xl font-bold text-primary tabular-nums">
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
        <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
          Current top: ${topAmount.toLocaleString()}
          {ladder === "daily" && " · resets at midnight UTC"}
        </p>

        <div className="relative">
          <Globe className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Your product URL or @handle"
            className="w-full rounded-full border border-input bg-secondary py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={80}
          placeholder="One-line tagline"
          className="w-full rounded-full border border-input bg-secondary px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-full border border-input bg-secondary px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary"
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
          className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold tracking-wide text-primary-foreground uppercase disabled:opacity-60 hover:opacity-90"
        >
          {busy ? "One moment…" : ladder === "daily" ? "Claim today's #1" : "Claim rank"}
        </button>
      </div>

      {/* Top 3 — tinted zone, like outbid.lol's highlighted block */}
      {top3.length > 0 ? (
        <div className="mt-5 rounded-lg bg-primary/5 p-2">
          <ol className="space-y-2">
            {top3.map((s, i) => (
              <SponsorRow key={s.id} rank={i + 1} s={s} onOpen={onClickListing} onClaimHere={() => claimHereFor(s)} />
            ))}
          </ol>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {ladder === "daily" ? "No one has claimed today yet." : "Be the first sponsor."} Claim #1 for just $
          {SPONSOR_MIN_INCREMENT}.
        </div>
      )}

      {/* Ranks #4 and below */}
      {rest.length > 0 && (
        <ol className="mt-3 space-y-2">
          {rest.map((s, i) => (
            <SponsorRow key={s.id} rank={i + 4} s={s} onOpen={onClickListing} onClaimHere={() => claimHereFor(s)} />
          ))}
        </ol>
      )}

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
    </section>
  );
}
