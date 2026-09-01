import { createFileRoute } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${BRAND.name}` },
      {
        name: "description",
        content: "Free to play. Weekly leaderboard. No cash prizes, no payouts, no gambling.",
      },
      { property: "og:title", content: `Terms of Service — ${BRAND.name}` },
      {
        property: "og:description",
        content: "A free game experience. No cash prizes, no payouts, no betting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="pixel text-[12px] leading-[1.9] text-primary">TERMS OF SERVICE</h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-foreground">How it works</h2>
          <p>
            The game is free to play, with unlimited attempts. Your highest valid score each week is
            kept and ranked on that week&apos;s leaderboard; your all-time best is tracked separately.
          </p>
          <h2 className="text-foreground">Sponsors &amp; rewards</h2>
          <p>
            Each week's top 3 players may receive a promotional reward provided by that week's
            sponsors. Sponsors, not the platform, are responsible for fulfilling the reward they offer.
          </p>
          <h2 className="text-foreground">Not gambling</h2>
          <p>{BRAND.legal}</p>
          <h2 className="text-foreground">Fair play</h2>
          <p>
            Scores are validated on our servers. Sessions that look manipulated are flagged and may be
            rejected, which removes them from the leaderboard. Repeated tampering can cost you access.
          </p>
          <h2 className="text-foreground">Nicknames</h2>
          <p>
            Keep nicknames clean. We may rename or remove offensive or impersonating nicknames without
            notice.
          </p>
          <h2 className="text-foreground">Game changes</h2>
          <p>
            Every score is stored with the game version that produced it. If gameplay changes we may
            rank versions separately, but historical scores are never silently deleted.
          </p>
          <p>{BRAND.disclaimer}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
