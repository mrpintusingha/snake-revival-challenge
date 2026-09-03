import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bot,
  Briefcase,
  Building2,
  CheckSquare,
  ChevronDown,
  Coins,
  Compass,
  Code2,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Loader2,
  MapPin,
  Megaphone,
  Mic,
  MoreHorizontal,
  Newspaper,
  Palette,
  PenLine,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT } from "@/lib/config";
import { track } from "@/lib/analytics";
import { domainFor, faviconFor, rankBadge, TIER_AVATAR_BORDER, TIER_ROW_CLASS } from "@/lib/sponsorDisplay";
import {
  getHomeData,
  getSponsorClaimStatus,
  getSponsorStandings,
  recordSponsorClick,
} from "@/lib/api.functions";
import { useSponsorClaimForm } from "@/hooks/useSponsorClaimForm";
import { ClaimModal, type ClaimModalTarget } from "@/components/ClaimModal";

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
  "AI Agents & Infrastructure": Bot,
  "SEO & AI Visibility": Search,
  "Marketing & Advertising": Megaphone,
  "Crypto, Web3 & Investing": Coins,
  "Developer Tools": Code2,
  "Business, Finance & Legal": Landmark,
  "Security, Privacy & Compliance": ShieldCheck,
  "Health, Fitness & Wellness": HeartPulse,
  "Social Media & Creator Tools": Share2,
  "Leaderboards & Attention Markets": Trophy,
  "Hiring, Jobs & Careers": Briefcase,
  "Education & Learning": GraduationCap,
  "Agencies, Studios & Services": Building2,
  "Ecommerce & Retail": ShoppingCart,
  "Domains & Web Assets": Globe,
  "Games & Entertainment": Gamepad2,
  "People & Profiles": UserCircle,
  "Productivity & Personal Tools": CheckSquare,
  "Design & Creative": Palette,
  "Writing & Content": PenLine,
  "Directories, Launch & Discovery": Compass,
  "AI Media Generation": Sparkles,
  "Audio, Voice & Podcasting": Mic,
  "Sales & Lead Generation": TrendingUp,
  "Travel, Local & Lifestyle": MapPin,
  "Real Estate & Property": Home,
  "Media & News": Newspaper,
  Other: MoreHorizontal,
};

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
  const [faviconFailed, setFaviconFailed] = useState(false);
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
        className={cn(
          "flex gap-3 rounded p-3 text-sm transition-colors",
          TIER_ROW_CLASS[rank] ?? "border border-border/60 hover:border-primary",
        )}
      >
        <span className="flex w-6 shrink-0 justify-center pt-1">{rankBadge(rank)}</span>
        {favicon && !faviconFailed ? (
          <img
            src={favicon}
            alt=""
            className={cn("h-9 w-9 shrink-0 rounded-lg border object-cover", TIER_AVATAR_BORDER[rank] ?? "border-border")}
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold text-primary",
              TIER_AVATAR_BORDER[rank] ?? "border-border",
              "bg-secondary",
            )}
          >
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
  const [claimTarget, setClaimTarget] = useState<ClaimModalTarget | null>(null);

  const fnClick = useServerFn(recordSponsorClick);
  const fnClaimStatus = useServerFn(getSponsorClaimStatus);

  // Coming back from a real Dodo checkout: the return URL carries ?claim=<bidId>
  // (set server-side in claimSponsorRank). Poll briefly for confirmation —
  // the webhook is the source of truth and usually wins the race, this just
  // gives the sponsor visible feedback instead of silently landing here.
  useEffect(() => {
    const url = new URL(window.location.href);
    const bidId = url.searchParams.get("claim");
    if (!bidId) return;
    url.searchParams.delete("claim");
    window.history.replaceState({}, "", url.toString());

    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
        try {
          const res = await fnClaimStatus({ data: { bidId } });
          if (res.status === "succeeded") {
            toast.success(`Payment confirmed — you're claimed at $${res.amount.toLocaleString()}!`);
            void refetch();
            return;
          }
          if (res.status === "failed") {
            toast.error("Payment didn't go through — no charge was made. Try again whenever you're ready.");
            return;
          }
        } catch {
          // Network hiccup — keep polling.
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        toast("Still confirming your payment — refresh in a moment if your listing hasn't appeared yet.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const form = useSponsorClaimForm(ladder, floorAmount, () => void refetch());

  const switchLadder = (next: Ladder) => {
    if (next === ladder) return;
    setLadder(next);
    form.resetAmount();
  };

  const onClickListing = (s: Standing) => {
    void fnClick({ data: { bidId: s.id } });
    track("sponsor_listing_clicked", { bidId: s.id, ladder });
  };

  // Opens the same per-rank claim modal used by the homepage's Top Rankers
  // column — a sponsor claiming rank #7 (say) fills the form right there
  // instead of having its amount silently dropped into the box above, which
  // is always labeled "Claim #1 for" and would show the wrong rank number.
  const claimHereFor = (s: Standing, rank: number) => {
    setClaimTarget({ rank, amount: s.amount, linkUrl: s.link_url });
  };

  return (
    <>
    <section id="sponsor" className="neon-border w-full rounded p-4">
      <div className="flex items-center justify-center gap-2">
        <Trophy className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="pixel text-[11px] text-primary sm:text-sm">OUTBID FOR #1</h2>
      </div>

      {/* All-time / Today toggle */}
      <div className="mt-3 flex rounded-full border border-border bg-secondary/40 p-1 text-[11px] font-bold tracking-wide uppercase">
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
          {form.busy ? "One moment…" : "Claim rank"}
        </button>
      </div>

      {/* Top 3 — each row carries its own highlight (gold for #1, tinted green for #2/#3) */}
      {top3.length > 0 ? (
        <div className="mt-5 rounded-lg border border-border/30 p-2">
          <ol className="space-y-2">
            {top3.map((s, i) => (
              <SponsorRow key={s.id} rank={i + 1} s={s} onOpen={onClickListing} onClaimHere={() => claimHereFor(s, i + 1)} />
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
            <SponsorRow key={s.id} rank={i + 4} s={s} onOpen={onClickListing} onClaimHere={() => claimHereFor(s, i + 4)} />
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

    {claimTarget && (
      <ClaimModal target={claimTarget} onClose={() => setClaimTarget(null)} onClaimed={() => void refetch()} />
    )}
    </>
  );
}
