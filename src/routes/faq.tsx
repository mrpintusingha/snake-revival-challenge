import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, OPERATOR, SPONSOR_MIN_INCREMENT } from "@/lib/config";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: `FAQ — ${BRAND.name}` },
      {
        name: "description",
        content: "Common questions about playing 90s Kids and about the Outbid for #1 sponsor ranking.",
      },
      { property: "og:title", content: `FAQ — ${BRAND.name}` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Faq,
});

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-5">
      <h2 className="text-foreground">{q}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Faq() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="pixel text-[12px] leading-[1.9] text-primary">FAQ</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Common questions about {BRAND.short} — the game, the leaderboard, and the Outbid for #1 sponsor
          board. The{" "}
          <Link to="/rules" className="text-primary hover:opacity-80">
            Rules
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="text-primary hover:opacity-80">
            Terms
          </Link>{" "}
          are the source of truth if anything here ever conflicts.
        </p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <QA q="What is 90s Kids?">
            <p>
              A free, browser-based remake of the classic Nokia-era Snake game, with a real global and
              country leaderboard. No install, no account required to play — just a nickname.
            </p>
          </QA>

          <QA q="Is it really free?">
            <p>{BRAND.legal}</p>
          </QA>

          <QA q="How does the leaderboard work?">
            <p>
              Your best verified score is tracked all-time and shown on the global, country, and friends
              boards. Each week also has its own top-3 board that resets. Scores are recomputed
              server-side — the number your browser shows is never trusted as final.
            </p>
          </QA>

          <QA q="What is Outbid for #1?">
            <p>
              A separate, paid sponsor ranking that sits alongside the game — a business or X profile pays
              to appear on the board, sorted by amount paid. It has nothing to do with your Snake score;
              see the{" "}
              <Link to="/rules" className="text-primary hover:opacity-80">
                Rules
              </Link>{" "}
              for how it works.
            </p>
          </QA>

          <QA q="How much does it cost to rank on Outbid for #1?">
            <p>
              Whole US dollars, ${SPONSOR_MIN_INCREMENT} minimum. To take a specific rank, pay at least $
              {SPONSOR_MIN_INCREMENT} more than whatever currently holds it — your listing lands wherever
              that amount naturally sorts among everyone else active on the board.
            </p>
          </QA>

          <QA q="Do sponsor ranks expire?">
            <p>
              No — the board is all-time. What's paid never expires and is never wiped, though a listing
              can still be outranked as new bids come in.
            </p>
          </QA>

          <QA q="What can I list on Outbid for #1?">
            <p>
              A product website or an X @handle that you own or are authorized to represent. Illegal,
              adult, or deceptive content isn't allowed — full list in the{" "}
              <Link to="/rules" className="text-primary hover:opacity-80">
                Rules
              </Link>
              .
            </p>
          </QA>

          <QA q="How do I pay for a sponsor rank?">
            <p>
              Checkout runs through Dodo Payments. You choose an amount, pay, and your listing goes live
              the moment payment confirms — never before.
            </p>
          </QA>

          <QA q="Are sponsor payments refundable?">
            <p>
              No. Payments are final once your listing is claimed — see the{" "}
              <Link to="/terms" className="text-primary hover:opacity-80">
                Terms of Service
              </Link>{" "}
              for the complete policy.
            </p>
          </QA>

          <QA q="Are scores fair — can people cheat?">
            <p>
              Every session is validated on our servers: timing, pacing, and the final score are all
              recomputed independently of what the browser reports. Sessions that look manipulated are
              flagged and excluded from the leaderboard.
            </p>
          </QA>

          <QA q="Who built this?">
            <p>
              {OPERATOR.name}, as an independent project. Say hi at{" "}
              <a href={OPERATOR.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80">
                {OPERATOR.twitterHandle}
              </a>{" "}
              on X.
            </p>
          </QA>

          <QA q="How do I contact you or report a listing?">
            <p>
              Email{" "}
              <a href={`mailto:${OPERATOR.email}`} className="text-primary hover:opacity-80">
                {OPERATOR.email}
              </a>{" "}
              — see the{" "}
              <Link to="/contact" className="text-primary hover:opacity-80">
                Contact
              </Link>{" "}
              page for what to include.
            </p>
          </QA>
        </div>
      </main>
      <Footer />
    </div>
  );
}
