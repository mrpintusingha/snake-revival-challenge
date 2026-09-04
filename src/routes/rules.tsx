import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, OPERATOR, SPONSOR_CATEGORIES, SPONSOR_MIN_INCREMENT } from "@/lib/config";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: `Rules — Outbid For #1 — ${BRAND.name}` },
      {
        name: "description",
        content: "How the sponsor ranking on 90s Kids works: what it costs, what you can list, and what happens after you pay.",
      },
      { property: "og:title", content: `Rules — Outbid For #1 — ${BRAND.name}` },
      {
        property: "og:description",
        content: "Rank is what you pay. No ads network, no bidding wars decided by anyone but you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rules,
});

function Rules() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="pixel text-[12px] leading-[1.9] text-primary">RULES — OUTBID FOR #1</h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            {BRAND.short} is a free Snake game with a real audience. Alongside it sits{" "}
            <a href="/#sponsor" className="text-primary hover:opacity-80">
              Outbid for #1
            </a>{" "}
            — a public sponsor board where a business or profile pays to be seen by everyone who plays.
            Rank is what you pay. Nobody reviews your listing, nobody votes on it, and nobody removes you
            to make room for someone else — they just rank below you once you're outbid.
          </p>

          <h2 className="text-foreground">How ranking works</h2>
          <p>
            Every active listing is sorted by amount paid, highest first. To take a specific rank, pay at
            least ${SPONSOR_MIN_INCREMENT} more than whatever is currently there. Your listing lands at
            whatever position that amount naturally sorts to among everyone else — you're never bumped
            off the board, only outranked. Amounts are whole US dollars, ${SPONSOR_MIN_INCREMENT} minimum,
            $1,000,000 maximum.
          </p>
          <p>
            The board shown today is <span className="text-foreground">all-time</span> — what you pay
            never expires and is never wiped. A daily-reset board exists in the system and may return
            later once there's enough sponsor volume to make it worth splitting.
          </p>

          <h2 className="text-foreground">Already on the board?</h2>
          <p>
            Submitting the same URL or @handle again creates a new, separate listing rather than raising
            your existing one — both stay visible, ranked independently by what each one paid. If you want
            a single listing raised instead, email us at{" "}
            <a href={`mailto:${OPERATOR.email}`} className="text-primary hover:opacity-80">
              {OPERATOR.email}
            </a>{" "}
            and we'll help.
          </p>

          <h2 className="text-foreground">What you can list</h2>
          <p>A product website, or an X @handle. Enter it as a bare domain, a full URL, or @handle — we resolve it.</p>

          <h2 className="text-foreground">What's not allowed</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Illegal content, or content that infringes someone else's rights.</li>
            <li>Sexual content — porn, NSFW, or adult platforms don't belong on a page kids and families play on.</li>
            <li>Malware, phishing, or anything designed to deceive visitors.</li>
            <li>A listing for a business you don't own or aren't authorized to represent.</li>
          </ul>
          <p>
            We reserve the right to remove a listing that breaks these rules, at any time, without a
            refund.
          </p>

          <h2 className="text-foreground">Categories</h2>
          <p>
            Every listing picks one category at checkout, from {SPONSOR_CATEGORIES.length} options
            covering everything from developer tools to games and media. Picked the wrong one? Email{" "}
            <a href={`mailto:${OPERATOR.email}`} className="text-primary hover:opacity-80">
              {OPERATOR.email}
            </a>{" "}
            and we'll fix it.
          </p>

          <h2 className="text-foreground">Payment</h2>
          <p>
            Checkout runs through Dodo Payments. Your rank is granted the moment payment is confirmed —
            we never trust a browser's own claim of success, only the payment provider's. Full payment
            terms are in the{" "}
            <Link to="/terms" className="text-primary hover:opacity-80">
              Terms of Service
            </Link>
            .
          </p>

          <h2 className="text-foreground">After you pay</h2>
          <p>
            Your listing goes live the moment payment confirms — a domain, favicon, category, and the
            tagline you wrote, visible to everyone browsing the board. Clicks are counted and shown
            publicly on your listing. Payments are final; see the{" "}
            <Link to="/terms" className="text-primary hover:opacity-80">
              Terms of Service
            </Link>{" "}
            for the full refund policy.
          </p>

          <p>{BRAND.legal}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
