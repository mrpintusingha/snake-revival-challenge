import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/config";

export function Header({ playersOnline }: { playersOnline?: number | undefined }) {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2 text-[10px] tracking-widest text-muted-foreground uppercase sm:text-xs">
          <span className="h-2 w-2 rounded-full pulse-dot" aria-hidden />
          <span className="font-bold text-foreground">Live</span>
          {typeof playersOnline === "number" && (
            <span className="hidden sm:inline">· {playersOnline.toLocaleString()} players online</span>
          )}
        </div>

        <Link to="/" className="order-first flex flex-col items-center text-center sm:order-none">
          <span className="pixel text-[13px] text-primary sm:text-base">{BRAND.short}</span>
          <span className="mt-1 text-[9px] tracking-[0.2em] text-muted-foreground uppercase sm:text-[10px]">
            {BRAND.tagline1}
          </span>
        </Link>

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
