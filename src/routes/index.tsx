import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SnakeTeaser } from "@/components/SnakeTeaser";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND } from "@/lib/config";
import { getHomeData } from "@/lib/api.functions";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Can You Still Beat Your Friends?` },
      {
        name: "description",
        content:
          "You played Snake as a kid. Now prove you still have it. Enter the 90s Snake Challenge, get your score and challenge your friends.",
      },
      { property: "og:title", content: `${BRAND.name} — Can You Still Beat Your Friends?` },
      {
        property: "og:description",
        content: "You played it as a kid. Can you still beat your friends? Enter the challenge.",
      },
    ],
  }),
  component: Landing,
});

function activityLine(e: { event_type: string; metadata: Record<string, unknown> }) {
  const name = (e.metadata["nickname"] as string) ?? "Someone";
  const score = e.metadata["score"] as number | undefined;
  const rank = e.metadata["rank"] as number | undefined;
  switch (e.event_type) {
    case "score":
      return `${name} just scored ${score?.toLocaleString()}.`;
    case "top100":
      return `${name} entered the Top 100.`;
    case "challenge":
      return `${name} challenged a friend.`;
    case "rank":
      return `${name} reached #${rank}.`;
    default:
      return `${name} is playing.`;
  }
}

function Landing() {
  const { data } = useQuery({ queryKey: ["home"], queryFn: () => getHomeData(), staleTime: 30000 });

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-5">
        <section className="rise pt-6 pb-2 text-center">
          <div className="text-5xl" aria-hidden>
            🐍
          </div>
          <h1 className="pixel mt-6 text-[15px] leading-[1.8] text-primary sm:text-xl">
            {BRAND.name}
          </h1>
          <p className="mt-6 text-2xl font-bold sm:text-3xl">{BRAND.tagline1}</p>
          <p className="text-2xl font-bold text-primary sm:text-3xl">{BRAND.tagline2}</p>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            The classic mobile Snake experience, rebuilt for the 90s generation.
          </p>
        </section>

        <section className="mt-8 flex justify-center">
          <SnakeTeaser />
        </section>

        <section className="mt-8">
          <Link
            to="/play"
            onClick={() => track("challenge_cta_clicked", { placement: "hero" })}
            className="block w-full rounded bg-primary px-6 py-5 text-center text-base font-bold tracking-wide text-primary-foreground uppercase active:opacity-90"
          >
            {BRAND.cta}
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            3 official attempts • Global ranking • Challenge your friends
          </p>
        </section>

        {/* Real numbers only — hidden until the database has them */}
        <section className="mt-10 grid grid-cols-3 gap-3 text-center">
          <Stat value={data?.players} label="players" />
          <Stat value={data?.topScore} label="top score" />
          <Stat value={data?.challengesToday} label="challenges today" />
        </section>

        {!!data?.playingNow && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            🟢 {data.playingNow} {data.playingNow === 1 ? "person is" : "people are"} playing right now
          </p>
        )}

        {!!data?.activity.length && (
          <section className="mt-8 space-y-1 border-l-2 border-border pl-4 text-xs text-muted-foreground">
            {data.activity.slice(0, 5).map((e) => (
              <p key={e.id as string}>
                {activityLine(e as { event_type: string; metadata: Record<string, unknown> })}
              </p>
            ))}
          </section>
        )}

        <section className="mt-14">
          <h2 className="pixel text-center text-[11px] text-primary sm:text-sm">
            WHO&apos;S STILL GOT IT?
          </h2>
          <ol className="mt-6 divide-y divide-border border-y border-border">
            {(data?.leaderboard ?? []).map((row, i) => (
              <li key={row.id as string} className="flex items-center gap-3 py-3 text-sm">
                <span className="w-8 text-center">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}</span>
                <Link to="/p/$id" params={{ id: row.id as string }} className="flex-1 truncate hover:text-primary">
                  {row.nickname as string}
                </Link>
                <span className="font-mono tabular-nums">
                  {(row.best_score as number).toLocaleString()}
                </span>
              </li>
            ))}
            {!data?.leaderboard.length && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No scores yet. The first name on this board could be yours.
              </li>
            )}
          </ol>
          <Link
            to="/play"
            onClick={() => track("challenge_cta_clicked", { placement: "leaderboard" })}
            className="mt-6 block text-center text-sm font-bold tracking-wide text-primary uppercase"
          >
            Can you enter the Top 100?
          </Link>
        </section>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Step n="1" title="ENTER" body={`Pay $1 to enter the official challenge.`} />
          <Step n="2" title="PLAY" body="Play the classic Snake experience." />
          <Step n="3" title="CHALLENGE" body="Get your score and challenge your friends." />
        </section>

        <section className="mt-14">
          <Link
            to="/play"
            onClick={() => track("challenge_cta_clicked", { placement: "footer" })}
            className="block w-full rounded bg-primary px-6 py-5 text-center text-base font-bold tracking-wide text-primary-foreground uppercase"
          >
            {BRAND.cta}
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-xl tabular-nums">
        {value == null ? "—" : value.toLocaleString()}
      </div>
      <div className="text-[10px] tracking-widest text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="pixel text-[10px] text-primary">{n}. {title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
