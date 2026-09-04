import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, Users } from "lucide-react";
import { BRAND } from "@/lib/config";
import { getPlayerSecret } from "@/lib/player";
import { getSponsorTopBid, getVisitorStats, recordVisit } from "@/lib/api.functions";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

const VISIT_RECORDED_KEY = "snake90_visit_recorded";

export function Header() {
  const onlineCount = useOnlinePresence();
  const fnRecordVisit = useServerFn(recordVisit);
  const { data } = useQuery({
    queryKey: ["visitor-stats"],
    queryFn: () => getVisitorStats(),
    staleTime: 30000,
  });
  const { data: topBid } = useQuery({
    queryKey: ["sponsor-top-bid"],
    queryFn: () => getSponsorTopBid(),
    staleTime: 15000,
  });

  // One real visit per tab session — the upsert is idempotent either way,
  // this just avoids a redundant request on every route change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(VISIT_RECORDED_KEY)) return;
    sessionStorage.setItem(VISIT_RECORDED_KEY, "1");
    void fnRecordVisit({ data: { secret: getPlayerSecret() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link to="/" className="flex flex-col text-left">
          <span className="pixel text-[13px] text-primary sm:text-base">{BRAND.short}</span>
          <span className="mt-1 text-[9px] tracking-[0.2em] text-muted-foreground uppercase sm:text-[10px]">
            {BRAND.tagline1}
          </span>
        </Link>

        <div className="order-first flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[10px] font-bold text-foreground sm:order-none sm:text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full pulse-dot" aria-hidden />
            {onlineCount ?? "…"} online
          </span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" aria-hidden />
            {(data?.totalVisitors ?? 0).toLocaleString()} visitors
          </span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-primary" aria-hidden />
            Top bid ${(topBid?.amount ?? 0).toLocaleString()}
          </span>
        </div>

        <nav className="flex items-center gap-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:text-xs">
          <Link to="/" className="text-primary hover:opacity-80" activeOptions={{ exact: true }}>
            Play
          </Link>
          <Link to="/leaderboard" className="hover:text-foreground">
            Leaderboard
          </Link>
          <a href="/#sponsor" className="hover:text-foreground">
            Advertise
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-4 w-full max-w-3xl border-t border-border/60 px-5 py-8 text-xs leading-relaxed text-muted-foreground">
      <p>{BRAND.disclaimer}</p>
      <p className="mt-2">{BRAND.legal}</p>
      <p className="mt-3 flex flex-wrap gap-4">
        <Link to="/leaderboard" className="hover:text-foreground">
          Leaderboard
        </Link>
        <Link to="/" className="hover:text-foreground">
          Play
        </Link>
        <Link to="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </p>
    </footer>
  );
}
