import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/config";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
      <Link to="/" className="flex items-center gap-2">
        <span aria-hidden>🐍</span>
        <span className="pixel text-[10px] text-primary">{BRAND.short}</span>
      </Link>
      <nav className="flex items-center gap-4 text-xs tracking-wide text-muted-foreground uppercase">
        <Link to="/leaderboard" className="hover:text-foreground">
          Leaderboard
        </Link>
        <Link to="/" className="text-primary hover:opacity-80">
          Play
        </Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-3xl border-t border-border px-5 py-8 text-xs leading-relaxed text-muted-foreground">
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
