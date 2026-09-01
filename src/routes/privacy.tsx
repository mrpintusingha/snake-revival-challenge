import { createFileRoute } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${BRAND.name}` },
      {
        name: "description",
        content:
          "What the 90s Nokia Snake Challenge stores: a nickname, an optional country, and your scores. Nothing else.",
      },
      { property: "og:title", content: `Privacy Policy — ${BRAND.name}` },
      {
        property: "og:description",
        content: "We collect only a nickname, an optional country, and your scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="pixel text-[12px] leading-[1.9] text-primary">PRIVACY POLICY</h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            We keep this deliberately small. Playing needs a nickname and, optionally, a country.
            That is all the personal information we ask for. Playing is free.
          </p>
          <h2 className="text-foreground">What we store</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your chosen nickname and optional country.</li>
            <li>A random identifier for your browser, stored only as a one-way hash on our side.</li>
            <li>Your game sessions, scores, achievements and challenge links.</li>
          </ul>
          <h2 className="text-foreground">What we do not collect</h2>
          <p>No home address, no phone number, no email is required to play.</p>
          <h2 className="text-foreground">Analytics and cookies</h2>
          <p>
            We use PostHog for anonymous product analytics (page views and game funnel events) so we
            can improve the experience. We use browser local storage to remember your player identity
            and any pending challenge — this is required for the game to work.
          </p>
          <h2 className="text-foreground">Sponsors</h2>
          <p>
            Weekly sponsors do not receive any player data. Sponsor payment processing, when it exists,
            is handled entirely between the sponsor and our payment provider.
          </p>
          <h2 className="text-foreground">Deleting your data</h2>
          <p>Ask us and we will remove your profile, scores and challenge links.</p>
          <p>{BRAND.disclaimer}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
