import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND } from "@/lib/config";
import { getProfile } from "@/lib/api.functions";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }) => {
    const profile = await getProfile({ data: { id: params.id } });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Player not found" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.nickname} — ${loaderData.best_score.toLocaleString()} on ${BRAND.short}`;
    const description = `${loaderData.nickname} is global #${loaderData.rankGlobal} on the ${BRAND.name}. Can you beat them?`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProfilePage,
  errorComponent: () => <NotHere />,
  notFoundComponent: () => <NotHere />,
});

function NotHere() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="pixel text-[11px] text-primary">PLAYER NOT FOUND</p>
        <Link to="/" className="mt-6 block text-sm text-muted-foreground underline">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ProfilePage() {
  const p = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-md px-5 py-8 text-center">
        <h1 className="pixel text-[13px] text-primary">{p.nickname.toUpperCase()}</h1>
        <p className="mt-6 font-mono text-5xl font-bold tabular-nums">
          🐍 {p.best_score.toLocaleString()}
        </p>
        <p className="mt-3 text-sm">GLOBAL #{p.rankGlobal}</p>
        {p.country && p.rankCountry && (
          <p className="text-sm text-muted-foreground">
            {p.country} #{p.rankCountry}
          </p>
        )}
        <p className="pixel mt-5 text-[11px] text-primary">{p.tier.toUpperCase()}</p>
        <p className="mt-4 text-xs text-muted-foreground">{p.games_played} games played</p>

        {!!p.recent.length && (
          <ul className="mt-8 divide-y divide-border border-y border-border text-sm">
            {p.recent.map((s, i) => (
              <li key={i} className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  {new Date(s.created_at as string).toLocaleDateString()}
                </span>
                <span className="font-mono tabular-nums">{(s.score as number).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}

        {p.challengeCode && (
          <Link
            to="/challenge/$code"
            params={{ code: p.challengeCode }}
            className="mt-8 block w-full rounded bg-primary px-6 py-5 text-sm font-bold tracking-wide text-primary-foreground uppercase"
          >
            Challenge me
          </Link>
        )}
        <Link
          to="/play"
          className="mt-3 block w-full rounded border border-primary px-6 py-4 text-sm font-bold tracking-wide text-primary uppercase"
        >
          {BRAND.cta}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
