import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, OPERATOR } from "@/lib/config";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: `Contact — ${BRAND.name}` },
      {
        name: "description",
        content: `Get in touch about ${BRAND.short} — the game, the leaderboard, or a sponsor listing.`,
      },
      { property: "og:title", content: `Contact — ${BRAND.name}` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="pixel text-[12px] leading-[1.9] text-primary">CONTACT</h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            {BRAND.short} is built and run by {OPERATOR.name}. For anything about the game, the
            leaderboard, a sponsor listing, a category correction, a takedown request, or a privacy
            question, reach out directly.
          </p>

          <div className="space-y-3 rounded border border-border p-4">
            <a
              href={`mailto:${OPERATOR.email}`}
              className="flex items-center gap-3 text-foreground hover:text-primary"
            >
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              {OPERATOR.email}
            </a>
            <a
              href={OPERATOR.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-foreground hover:text-primary"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              {OPERATOR.twitterHandle} on X
            </a>
          </div>

          <h2 className="text-foreground">What to include</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Sponsor listing questions — the link/handle you claimed and a screenshot if useful.</li>
            <li>Category corrections — which listing, and the category it should be in.</li>
            <li>Rights or takedown notices — the listing URL on this site and the issue.</li>
            <li>Player data requests — the nickname or profile link tied to your device.</li>
          </ul>

          <p>We read every message. Response times vary since this is a small, independently run site.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
