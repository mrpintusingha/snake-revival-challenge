/**
 * PostHog analytics. Loaded lazily in the browser only, and a no-op when
 * VITE_POSTHOG_KEY is not configured.
 */

type Props = Record<string, unknown>;

let loading: Promise<void> | null = null;

type PostHogLike = { capture: (e: string, p?: Props) => void; init: (k: string, o: Props) => void };

function ph(): PostHogLike | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { posthog?: PostHogLike }).posthog ?? null;
}

export function initAnalytics() {
  if (typeof window === "undefined" || loading) return;
  const key = import.meta.env["VITE_POSTHOG_KEY"] as string | undefined;
  if (!key) return;
  const host = (import.meta.env["VITE_POSTHOG_HOST"] as string | undefined) ?? "https://us.i.posthog.com";
  loading = import("posthog-js")
    .then((m) => {
      m.default.init(key, { api_host: host, capture_pageview: true });
      (window as unknown as { posthog?: unknown }).posthog = m.default;
    })
    .catch(() => undefined);
}

export function track(event: string, props?: Props) {
  if (typeof window === "undefined") return;
  ph()?.capture(event, props);
  if (import.meta.env.DEV) console.debug("[analytics]", event, props ?? {});
}
