import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import { getSponsorActivity } from "@/lib/api.functions";
import { timeAgo } from "@/lib/time";

type ActivityRow = { id: string; event_type: string; metadata: Record<string, unknown>; created_at: string };

/** Human line for a real, confirmed sponsor_claim row — never fabricated. */
function activityLine(row: ActivityRow): string {
  const domain = (row.metadata?.["domain"] as string) ?? "A sponsor";
  const rank = Number(row.metadata?.["rank"] ?? 0);
  const amount = Number(row.metadata?.["amount"] ?? 0);
  return `${domain} claimed #${rank} for $${amount.toLocaleString()}`;
}

/**
 * Its own card, separate from the sponsor ladder — a real, live-refreshing
 * feed of confirmed sponsor claims only. Shows an honest empty state
 * rather than falling back to unrelated (game) activity when there aren't
 * any yet.
 */
export function LiveActivityFeed() {
  const { data } = useQuery({
    queryKey: ["sponsor-activity"],
    queryFn: () => getSponsorActivity(),
    staleTime: 20000,
    refetchInterval: 30000,
  });
  const activity = ((data?.activity ?? []) as ActivityRow[]).slice(0, 6);

  return (
    <section className="neon-border w-full rounded bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-primary uppercase">
          <Zap className="h-3.5 w-3.5" aria-hidden /> Live activity
        </h3>
        <span className="flex items-center gap-1 text-[9px] tracking-widest text-primary/70 uppercase">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Refreshing live
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {activity.map((row) => (
          <li key={row.id} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-foreground">{activityLine(row)}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground/70">{timeAgo(row.created_at)}</span>
          </li>
        ))}
        {!activity.length && (
          <li className="text-xs text-muted-foreground">No sponsor activity yet — be the first to claim a rank.</li>
        )}
      </ul>
    </section>
  );
}
