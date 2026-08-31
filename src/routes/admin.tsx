import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Footer, Header } from "@/components/SiteChrome";
import { adminStats } from "@/lib/api.functions";
import { formatPrice } from "@/lib/config";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — 90s Snake" },
      { name: "description", content: "Internal dashboard." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — 90s Snake" },
      { property: "og:description", content: "Internal dashboard." },
    ],
  }),
  component: AdminPage,
});

type Stats = Awaited<ReturnType<typeof adminStats>>;

function AdminPage() {
  const fn = useServerFn(adminStats);
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setStats(await fn({ data: { password } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        {!stats ? (
          <div className="mx-auto max-w-sm space-y-4">
            <h1 className="pixel text-[11px] text-primary">ADMIN</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Password"
              className="w-full rounded border border-input bg-secondary px-4 py-3 outline-none focus:border-primary"
            />
            <button
              type="button"
              disabled={busy}
              onClick={load}
              className="w-full rounded bg-primary px-4 py-3 text-sm font-bold uppercase text-primary-foreground"
            >
              Sign in
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-8">
            <h1 className="pixel text-[11px] text-primary">DASHBOARD</h1>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Players" value={stats.totalPlayers} />
              <Metric label="Paid players" value={stats.paidPlayers} />
              <Metric label="Payments" value={stats.payments} />
              <Metric label="Revenue" value={formatPrice(stats.revenue)} />
              <Metric label="Today players" value={stats.todayPlayers} />
              <Metric label="Today revenue" value={formatPrice(stats.todayRevenue)} />
              <Metric label="Games played" value={stats.gamesPlayed} />
              <Metric label="Avg score" value={stats.avgScore} />
              <Metric label="Top score" value={stats.topScore} />
              <Metric label="Challenges" value={stats.challengesCreated} />
              <Metric label="Opened" value={stats.challengesOpened} />
              <Metric label="Repeat players" value={stats.repeatPlayers} />
              <Metric label="Flagged scores" value={stats.flaggedCount} />
            </div>

            <Section title="Recent payments">
              {stats.recentPayments.map((p) => (
                <Row
                  key={p.id as string}
                  left={`${p.status}${p.test_mode ? " (test)" : ""}`}
                  right={`${p.currency} ${p.amount}`}
                  when={p.created_at as string}
                />
              ))}
            </Section>
            <Section title="Recent games">
              {stats.recentGames.map((g) => (
                <Row
                  key={g.id as string}
                  left={`Attempt ${g.attempt_number} — ${g.status}`}
                  right={String(g.score ?? "—")}
                  when={g.started_at as string}
                />
              ))}
            </Section>
            <Section title="Recent challenges">
              {stats.recentChallenges.map((c) => (
                <Row
                  key={c.challenge_code as string}
                  left={`${c.challenge_code} — ${c.opens} opens`}
                  right={String(c.challenger_score)}
                  when={c.created_at as string}
                />
              ))}
            </Section>
            <Section title="Flagged scores">
              {stats.flaggedScores.length === 0 && (
                <p className="py-3 text-sm text-muted-foreground">None.</p>
              )}
              {stats.flaggedScores.map((s) => (
                <Row
                  key={s.id as string}
                  left={s.status as string}
                  right={String(s.score)}
                  when={s.created_at as string}
                />
              ))}
            </Section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border p-3">
      <div className="font-mono text-xl tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-[10px] tracking-widest text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{title}</h2>
      <div className="mt-2 divide-y divide-border border-y border-border">{children}</div>
    </section>
  );
}

function Row({ left, right, when }: { left: string; right: string; when: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span>{left}</span>
      <span className="flex gap-4">
        <span className="text-muted-foreground">{new Date(when).toLocaleString()}</span>
        <span className="font-mono tabular-nums">{right}</span>
      </span>
    </div>
  );
}
