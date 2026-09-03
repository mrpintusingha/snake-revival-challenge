-- Durable, monotonically-increasing count of unique visitors — including
-- people who load the site but never play (so `profiles` alone undercounts
-- this). Keyed off the same anonymous per-device secret already used for
-- player identity elsewhere; only ever written/read through server
-- functions using the service role, no anon/authenticated grants needed.

CREATE TABLE public.site_visitors (
  visitor_hash text PRIMARY KEY,
  first_seen timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.site_visitors TO service_role;
