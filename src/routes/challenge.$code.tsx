import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { Footer } from "@/components/SiteChrome";
import { BRAND } from "@/lib/config";
import { getChallenge, markChallengeOpened } from "@/lib/api.functions";
import { setPendingChallenge } from "@/lib/player";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/challenge/$code")({
  loader: async ({ params }) => {
    const challenge = await getChallenge({ data: { code: params.code } });
    if (!challenge) throw notFound();
    return challenge;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Challenge not found" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = loaderData.challenger?.nickname ?? "A friend";
    const score = loaderData.challenger_score.toLocaleString();
    const title = `${name} scored ${score} on ${BRAND.short}. Can you beat them?`;
    const description = `${name} thinks they've still got it. Beat ${score} on the ${BRAND.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: ChallengePage,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
});

function Missing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="pixel text-[11px] text-primary">CHALLENGE NOT FOUND</p>
      <p className="text-sm text-muted-foreground">That link has expired or never existed.</p>
      <Link
        to="/"
        className="rounded bg-primary px-6 py-4 text-sm font-bold tracking-wide text-primary-foreground uppercase"
      >
        {BRAND.cta}
      </Link>
    </div>
  );
}

function ChallengePage() {
  const challenge = Route.useLoaderData();
  const name = challenge.challenger?.nickname ?? "Your friend";

  useEffect(() => {
    setPendingChallenge(challenge.challenge_code);
    track("challenge_opened", { code: challenge.challenge_code });
    void markChallengeOpened({ data: { code: challenge.challenge_code } }).catch(() => undefined);
  }, [challenge.challenge_code]);

  return (
    <div className="min-h-screen">
      <main className="rise mx-auto flex w-full max-w-md flex-col items-center px-5 pt-14 text-center">
        <div className="text-5xl" aria-hidden>
          🐍
        </div>
        <h1 className="pixel mt-6 text-[13px] leading-[1.9] text-primary sm:text-base">
          {name.toUpperCase()} SCORED {challenge.challenger_score.toLocaleString()}
        </h1>
        <p className="mt-6 text-3xl font-bold">CAN YOU BEAT {name.split(" ")[0]?.toUpperCase()}?</p>
        <p className="mt-3 text-sm text-muted-foreground">{name} thinks he&apos;s still got it.</p>

        <div className="lcd-panel lcd-texture mt-10 w-full rounded-[3px] px-6 py-10">
          <p className="font-mono text-xs tracking-[0.3em] uppercase opacity-70">
            {name} vs you
          </p>
          <p className="mt-3 font-mono text-6xl font-bold tabular-nums">
            {challenge.challenger_score.toLocaleString()}
          </p>
        </div>

        <p className="mt-8 text-base font-bold">
          Beat {challenge.challenger_score.toLocaleString()} to take the crown.
        </p>

        <Link
          to="/"
          onClick={() => track("friend_checkout_started", { code: challenge.challenge_code })}
          className="mt-6 block w-full rounded bg-primary px-6 py-5 text-base font-bold tracking-wide text-primary-foreground uppercase"
        >
          Beat this score
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          3 official attempts • Global ranking • Take the crown
        </p>
      </main>
      <Footer />
    </div>
  );
}
