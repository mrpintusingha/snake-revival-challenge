import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, OPERATOR, SPONSOR_MIN_INCREMENT } from "@/lib/config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${BRAND.name}` },
      {
        name: "description",
        content: "Free to play. Weekly leaderboard. Paid sponsor listings via Outbid for #1. No cash prizes, no gambling.",
      },
      { property: "og:title", content: `Terms of Service — ${BRAND.name}` },
      {
        property: "og:description",
        content: "A free game experience, plus a paid sponsor board. No cash prizes, no payouts, no betting.",
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
        <p className="mt-4 text-xs text-muted-foreground">
          These Terms cover both parts of {BRAND.short}: the free Snake game and leaderboard, and the paid
          Outbid for #1 sponsor board. By playing, submitting a listing, or completing a payment, you agree
          to these Terms.
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-foreground">The game</h2>
          <p>
            The game is free to play, with unlimited attempts. Your highest valid score each week is
            kept and ranked on that week&apos;s leaderboard; your all-time best is tracked separately.
          </p>
          <h2 className="text-foreground">Weekly rewards</h2>
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

          <h2 className="text-foreground">Outbid for #1 — paid sponsor listings</h2>
          <p>
            Separately from the free game, {BRAND.short} runs a public sponsor board: you may pay to list
            a product website or X profile and appear at a rank determined by amount paid. Full mechanics
            are in the{" "}
            <Link to="/rules" className="text-primary hover:opacity-80">
              Rules
            </Link>
            . A listing is a paid placement, not an editorial endorsement, review, or certification by us
            — appearing on the board is not our opinion of your product.
          </p>
          <p>
            A payment buys a rank at the position that amount supports at the time it's confirmed. It does
            not buy a fixed position for any length of time, a guaranteed number of clicks, or any other
            outcome — someone else can always outbid you.
          </p>

          <h2 className="text-foreground">Payment</h2>
          <p>
            Sponsor checkout is processed by Dodo Payments. We do not collect or store your full card
            details — that is handled entirely by Dodo Payments. Amounts are priced in whole US dollars,
            ${SPONSOR_MIN_INCREMENT} minimum. Rank is granted only once payment is confirmed by the
            payment provider.
          </p>

          <h2 className="text-foreground">No refunds</h2>
          <p>
            All sponsor payments are final. Placement is a digital service that begins the moment payment
            is confirmed and your listing goes live — being outranked later, fewer clicks than expected, a
            category you'd rather change, or removal for breaking these Terms does not create a refund,
            except where a mandatory consumer-protection law in your jurisdiction requires one.
          </p>

          <h2 className="text-foreground">Listing requirements</h2>
          <p>
            You may only list a website or X profile you own or are authorized to represent. The listing
            must not be illegal, sexual/adult content, malware, phishing, or designed to deceive visitors,
            and must not infringe someone else's rights. We may remove a listing that breaks these Terms
            or the{" "}
            <Link to="/rules" className="text-primary hover:opacity-80">
              Rules
            </Link>{" "}
            at any time, without a refund.
          </p>

          <h2 className="text-foreground">Fair use of public information</h2>
          <p>
            To display a sponsor listing we fetch and show publicly available information about the
            destination — its title, description, and favicon — solely to identify what's being listed.
            This isn't a claim of affiliation with or endorsement by the destination's owner unless the
            person listing it is that owner.
          </p>

          <h2 className="text-foreground">Disclaimer and liability</h2>
          <p>
            The Service is provided as-is, without warranties of any kind, to the fullest extent the law
            allows. We are not liable for indirect, incidental, or consequential damages arising from your
            use of the Service. Where liability cannot be excluded by law, it is limited to the amount you
            paid us for the specific listing a claim concerns.
          </p>

          <h2 className="text-foreground">Changes</h2>
          <p>
            We may update these Terms as the Service changes. Continued use after an update means you
            accept the new Terms. For a payment already completed, the Terms in effect at the time of that
            checkout still apply to it.
          </p>

          <h2 className="text-foreground">Contact</h2>
          <p>
            Questions about these Terms, a listing, or a payment: email{" "}
            <a href={`mailto:${OPERATOR.email}`} className="text-primary hover:opacity-80">
              {OPERATOR.email}
            </a>
            . See{" "}
            <Link to="/contact" className="text-primary hover:opacity-80">
              Contact
            </Link>{" "}
            for more.
          </p>

          <p>{BRAND.disclaimer}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
