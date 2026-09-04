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
import { SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT, nextWholeDollarAbove } from "@/lib/config";
import { track } from "@/lib/analytics";
import { domainFor, faviconFor, rankBadge, TIER_AVATAR_BORDER, TIER_ROW_CLASS } from "@/lib/sponsorDisplay";
import { looksLikeSponsorLink } from "@/lib/sponsorLink";
import { timeAgo } from "@/lib/time";
import { getSponsorClaimStatus, getSponsorStandings, recordSponsorClick } from "@/lib/api.functions";
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
        Claim this rank for ${nextWholeDollarAbove(s.amount).toLocaleString()}
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

type StandingsPage = {
  rows: Standing[];
  totalCount: number;
  page: number;
  pageSize: number;
  topAmount: number;
};

export function SponsorLadder() {
  // Daily ladder support (RPC, views, migrations) already exists server-side
  // but isn't exposed here yet — with only a handful of sponsors so far, an
  // All-time/Today split isn't useful. Revisit once volume justifies it.
  const ladder: Ladder = "all_time";
  const [page, setPage] = useState(1);
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
    queryKey: ["sponsor-standings", ladder, page],
    queryFn: () => getSponsorStandings({ data: { ladder, page } }) as Promise<StandingsPage>,
    staleTime: 10000,
    refetchInterval: 20000,
  });

  const standings = data?.rows ?? [];
  const pageSize = data?.pageSize ?? 20;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // The claim floor is always the single highest active amount across the
  // whole ladder, never just the current page's own top row — the server
  // tracks this independently of pagination so it's correct on every page.
  const topAmount = data?.topAmount ?? 0;
  const floorAmount = nextWholeDollarAbove(topAmount);
  // Podium styling (gold/silver/bronze) only makes sense for absolute ranks
  // 1-3, which only ever appear on page 1.
  const top3 = page === 1 ? standings.slice(0, 3) : [];
  const rest = page === 1 ? standings.slice(3) : standings;
  const restRankOffset = page === 1 ? 4 : (page - 1) * pageSize + 1;

  const form = useSponsorClaimForm(ladder, floorAmount, () => void refetch());

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


      {/* Claim box */}
      <div className="mt-4 space-y-3 rounded border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="ml-1 text-sm font-bold tracking-wide uppercase">Claim #1 for</span>
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

        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="relative">
              {faviconFor(form.linkUrl) && looksLikeSponsorLink(form.linkUrl) ? (
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
          <div className="relative min-w-0 flex-1">
            <select
              value={form.category}
              onChange={(e) => form.setCategory(e.target.value)}
              className={cn(
                "w-full appearance-none truncate rounded-full border border-input bg-secondary py-2 pr-8 pl-3.5 text-sm outline-none focus:border-primary",
                form.category ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                Category
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

      {/* Top 3 — each row carries its own highlight (gold for #1, tinted green for #2/#3). Only ever present on page 1. */}
      {standings.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Be the first sponsor. Claim #1 for just ${SPONSOR_MIN_INCREMENT}.
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="mt-5 rounded-lg border border-border/30 p-2">
              <ol className="space-y-2">
                {top3.map((s, i) => (
                  <SponsorRow key={s.id} rank={i + 1} s={s} onOpen={onClickListing} onClaimHere={() => claimHereFor(s, i + 1)} />
                ))}
              </ol>
            </div>
          )}

          {/* Remaining ranks on this page — #4+ on page 1, or the full page on any later page. */}
          {rest.length > 0 && (
            <ol className={cn("space-y-2", top3.length > 0 ? "mt-3" : "mt-5")}>
              {rest.map((s, i) => {
                const rank = restRankOffset + i;
                return <SponsorRow key={s.id} rank={rank} s={s} onOpen={onClickListing} onClaimHere={() => claimHereFor(s, rank)} />;
              })}
            </ol>
          )}
        </>
      )}

      {/* Pagination — the board scales to thousands of sponsors, 20 per page */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-bold tracking-wide uppercase hover:bg-accent disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-[11px] text-muted-foreground">
            Page {page} of {totalPages.toLocaleString()} · {totalCount.toLocaleString()} sponsors
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-bold tracking-wide uppercase hover:bg-accent disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

    </section>

    {claimTarget && (
      <ClaimModal target={claimTarget} onClose={() => setClaimTarget(null)} onClaimed={() => void refetch()} />
    )}
    </>
  );
}
