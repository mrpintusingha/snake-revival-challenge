import { createFileRoute } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, ENTRY_ATTEMPTS, formatPrice } from "@/lib/config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${BRAND.name}` },
      {
        name: "description",
        content: `One payment of ${formatPrice()} buys ${ENTRY_ATTEMPTS} official Snake attempts. Status and bragging rights only — no prizes, no payouts, no gambling.`,
      },
      { property: "og:title", content: `Terms of Service — ${BRAND.name}` },
      {
        property: "og:description",
        content: "A paid game experience. No cash prizes, no payouts, no betting.",
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
          <h2 className="text-foreground">What you are buying</h2>
          <p>
            One entry costs {formatPrice()} and gives you {ENTRY_ATTEMPTS} official attempts. Your
            highest valid score is kept and ranked. Attempts are consumed when a game starts.
          </p>
          <h2 className="text-foreground">Not gambling</h2>
          <p>{BRAND.legal}</p>
          <h2 className="text-foreground">Fair play</h2>
          <p>
            Scores are validated on our servers. Sessions that look manipulated are flagged and may be
            rejected, which removes them from the leaderboard. Repeated tampering can cost you access.
          </p>
          <h2 className="text-foreground">Refunds</h2>
          <p>
            If a payment succeeds but you never receive your attempts, contact us and we will restore
            the entry or refund it. Attempts already played are not refundable.
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
