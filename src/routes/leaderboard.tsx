import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND, tierFor } from "@/lib/config";
import { getLeaderboard, getWeeklyLeaderboard } from "@/lib/api.functions";
import { getStoredProfileId } from "@/lib/player";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: `Leaderboard — ${BRAND.name}` },
      {
        name: "description",
        content: "The global and country leaderboards for the 90s Snake Challenge. Who's still got it?",
      },
      { property: "og:title", content: `Leaderboard — ${BRAND.name}` },
      { property: "og:description", content: "Who's still got it? See the top Snake scores." },
    ],
  }),
  component: LeaderboardPage,
});

type Scope = "global" | "friends";

function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>("global");
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => setProfileId(getStoredProfileId()), []);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", scope, profileId],
    queryFn: () => getLeaderboard({ data: { scope, profileId } }),
    staleTime: 15000,
  });
  const { data: weekly } = useQuery({
    queryKey: ["weekly-leaderboard"],
    queryFn: () => getWeeklyLeaderboard(),
    staleTime: 20000,
  });

  const you = "you" in (data ?? {}) ? (data as { you: unknown }).you : null;
  const youRow = you && typeof you === "object" ? (you as { rank: number; best_score: number }) : null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5">
        <h1 className="pixel py-8 text-center text-[12px] text-primary sm:text-base">
          WHO&apos;S STILL GOT IT?
        </h1>

        <section className="mb-10">
          <h2 className="pixel text-[11px] text-primary sm:text-sm">THIS WEEK'S TOP 3</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            This week's top 3 players are rewarded by this week's sponsors.
          </p>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {(weekly?.rows ?? []).slice(0, 3).map((row: any) => (
              <li key={row.profileId as string} className="flex items-center gap-3 py-3 text-sm">
                <span className="w-10 text-left font-mono font-bold text-primary">#{row.rank}</span>
                <span className="flex-1 truncate font-bold uppercase tracking-wide">{row.nickname as string}</span>
                <span className="hidden w-32 truncate text-xs text-muted-foreground sm:block">
                  {(row.country as string) || "Unknown"}
                </span>
                <span className="w-20 text-right font-mono font-bold tabular-nums">
                  {(row.score as number).toLocaleString()}
                </span>
              </li>
            ))}
            {!weekly?.rows?.length && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No scores yet this week. The first name on this board could be yours.
              </li>
            )}
          </ol>
        </section>

        <h2 className="pixel pb-4 text-center text-[11px] text-muted-foreground sm:text-sm">ALL-TIME</h2>

        <div className="grid grid-cols-2 border border-border text-xs tracking-widest uppercase">
          {(["global", "friends"] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`py-3 ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {youRow && (
          <p className="mt-4 text-center text-sm font-bold text-primary">
            YOU ARE #{youRow.rank} — {youRow.best_score.toLocaleString()}
          </p>
        )}

        <ol className="mt-6 divide-y divide-border border-y border-border">
          {isLoading && <li className="py-8 text-center text-sm text-muted-foreground">Loading…</li>}
          {!isLoading && !data?.rows.length && (
            <li className="py-10 text-center text-sm text-muted-foreground">
              {scope === "friends"
                ? "Challenge a friend and your private board appears here."
                : "No verified scores yet."}
            </li>
          )}
          {data?.rows.map((row) => {
            const mine = row.id === profileId;
            return (
              <li
                key={row.id as string}
                className={`flex items-center gap-3 py-3 text-sm ${mine ? "bg-accent px-2 rounded font-bold" : ""}`}
              >
                <span className="w-10 text-left font-mono font-bold text-primary">#{row.rank}</span>
                <Link
                  to="/p/$id"
                  params={{ id: row.id as string }}
                  className="flex-1 truncate hover:text-primary font-bold uppercase tracking-wide"
                >
                  {row.nickname as string}
                  {mine && " (you)"}
                </Link>
                <span className="hidden w-32 truncate text-xs text-muted-foreground sm:block">
                  {row.country as string || "Unknown"}
                </span>
                <span className="w-20 text-right font-mono font-bold tabular-nums">
                  {(row.best_score as number).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>

        <Link
          to="/"
          className="mt-8 block w-full rounded bg-primary px-6 py-5 text-center text-base font-bold tracking-wide text-primary-foreground uppercase"
        >
          {BRAND.cta}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
