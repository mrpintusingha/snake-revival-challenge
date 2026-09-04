import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, Users } from "lucide-react";
import { BRAND, OPERATOR } from "@/lib/config";
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
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link to="/" className="flex items-start gap-2 text-left">
          <img
            src="/favicon.svg"
            alt=""
            aria-hidden
            className="mt-0.5 h-7 w-7 shrink-0 sm:h-8 sm:w-8"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="flex flex-col">
            <span className="pixel text-[13px] leading-none text-primary sm:text-base">{BRAND.short}</span>
            <span className="mt-1.5 text-[9px] tracking-wide text-muted-foreground sm:text-[10px]">
              {BRAND.tagline1}
            </span>
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

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:text-xs">
          <Link to="/" className="text-primary hover:opacity-80" activeOptions={{ exact: true }}>
            Play
          </Link>
          <Link to="/leaderboard" className="hover:text-foreground">
            Leaderboard
          </Link>
          <a href="/#sponsor" className="hover:text-foreground">
            Advertise
          </a>
          <Link to="/rules" className="hover:text-foreground">
            Rules
          </Link>
          <Link to="/faq" className="hover:text-foreground">
            FAQ
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold tracking-widest text-primary uppercase">{title}</h3>
      <ul className="mt-3 space-y-2 text-xs">{children}</ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 border-t border-border/60">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.svg"
                alt=""
                aria-hidden
                className="h-5 w-5 shrink-0"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="pixel text-[11px] text-primary">{BRAND.short}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{BRAND.tagline1}</p>
          </div>

          <FooterColumn title="Play">
            <li>
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                Play
              </Link>
            </li>
            <li>
              <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground">
                Leaderboard
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title="Advertise">
            <li>
              <a href="/#sponsor" className="text-muted-foreground hover:text-foreground">
                Claim a rank
              </a>
            </li>
            <li>
              <Link to="/rules" className="text-muted-foreground hover:text-foreground">
                Rules
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-muted-foreground hover:text-foreground">
                FAQ
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title="Legal">
            <li>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground">
                Terms
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          <p>
            {BRAND.disclaimer} {BRAND.legal}
          </p>
          <p className="mt-2">
            Built by {OPERATOR.name} ·{" "}
            <a href={OPERATOR.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80">
              {OPERATOR.twitterHandle}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
