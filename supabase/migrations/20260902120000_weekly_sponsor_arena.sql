-- Weekly game cycle, weekly leaderboard support, and Sponsor Arena schema.
-- Additive only: no existing table is dropped, renamed, or has a column removed.

/* ------------------------------------------------------------- game_weeks */

CREATE TABLE public.game_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start timestamptz NOT NULL,
  week_end timestamptz NOT NULL,
  game_key text NOT NULL DEFAULT 'snake',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_weeks_bounds_chk CHECK (week_end > week_start)
);
-- At most one active week at a time.
CREATE UNIQUE INDEX game_weeks_single_active_idx ON public.game_weeks ((status)) WHERE status = 'active';
CREATE INDEX game_weeks_bounds_idx ON public.game_weeks (week_start, week_end);

GRANT SELECT ON public.game_weeks TO anon, authenticated;
GRANT ALL ON public.game_weeks TO service_role;
ALTER TABLE public.game_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read game_weeks" ON public.game_weeks FOR SELECT TO anon, authenticated USING (true);

-- Seed the current ISO week (Monday 00:00 UTC) as active so the weekly
-- leaderboard has a window to query from day one.
INSERT INTO public.game_weeks (week_start, week_end, game_key, status)
VALUES (
  date_trunc('week', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc',
  (date_trunc('week', now() AT TIME ZONE 'utc') + interval '7 days') AT TIME ZONE 'utc',
  'snake',
  'active'
);

/* --------------------------------------------------------- sponsor_auctions */

CREATE TABLE public.sponsor_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL UNIQUE REFERENCES public.game_weeks(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  min_bid numeric(10,2) NOT NULL DEFAULT 25,
  min_increment numeric(10,2) NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsor_auctions_bounds_chk CHECK (ends_at > starts_at)
);
CREATE INDEX sponsor_auctions_status_idx ON public.sponsor_auctions (status);

GRANT SELECT ON public.sponsor_auctions TO anon, authenticated;
GRANT ALL ON public.sponsor_auctions TO service_role;
ALTER TABLE public.sponsor_auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sponsor_auctions" ON public.sponsor_auctions FOR SELECT TO anon, authenticated USING (true);

/* ------------------------------------------------------------ sponsor_bids */

CREATE TABLE public.sponsor_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.sponsor_auctions(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  sponsor_contact text NOT NULL,
  amount numeric(10,2) NOT NULL,
  reward_description text NOT NULL,
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsor_bids_amount_chk CHECK (amount > 0)
);
CREATE INDEX sponsor_bids_auction_idx ON public.sponsor_bids (auction_id, amount DESC);
CREATE INDEX sponsor_bids_active_idx ON public.sponsor_bids (auction_id) WHERE is_active = true;
CREATE UNIQUE INDEX sponsor_bids_payment_reference_idx ON public.sponsor_bids (payment_reference) WHERE payment_reference IS NOT NULL;

-- No anon/authenticated grant here on purpose: sponsor_contact and
-- payment_reference must never be reachable via the public REST API.
-- Public standings are exposed only through the sponsor_standings view below.
GRANT ALL ON public.sponsor_bids TO service_role;
ALTER TABLE public.sponsor_bids ENABLE ROW LEVEL SECURITY;

-- Public-safe view: only what "Today's Sponsor" UI needs, never contact info
-- or the payment reference. Runs with the view owner's privileges, so it can
-- read sponsor_bids on the caller's behalf without granting the base table.
CREATE VIEW public.sponsor_standings AS
SELECT
  sb.id AS bid_id,
  sb.auction_id,
  sb.sponsor_name,
  sb.amount,
  sb.reward_description,
  sb.created_at
FROM public.sponsor_bids sb
WHERE sb.is_active = true;

GRANT SELECT ON public.sponsor_standings TO anon, authenticated;

/* ---------------------------------------------------------- weekly_results */

CREATE TABLE public.weekly_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.game_weeks(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score integer NOT NULL,
  sponsor_bid_id uuid REFERENCES public.sponsor_bids(id) ON DELETE SET NULL,
  reward_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_results_rank_chk CHECK (rank BETWEEN 1 AND 3),
  UNIQUE (week_id, rank)
);
CREATE INDEX weekly_results_profile_idx ON public.weekly_results (profile_id);

GRANT SELECT ON public.weekly_results TO anon, authenticated;
GRANT ALL ON public.weekly_results TO service_role;
ALTER TABLE public.weekly_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read weekly_results" ON public.weekly_results FOR SELECT TO anon, authenticated USING (true);

/* --------------------------------------------------- weekly leaderboard idx */

-- Supports "best score per profile within [week_start, week_end)":
-- equality on status + range on created_at as index conditions, sorted by
-- score in memory afterward (bounded to one week of rows, so this stays cheap
-- even as historical data grows).
CREATE INDEX scores_weekly_leaderboard_idx ON public.scores (status, created_at);

-- Aggregation (best score per profile, this week) happens in SQL rather than
-- the app layer so it stays a single bounded, indexed query instead of
-- pulling every row of the week over the wire to group in JS.
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_week_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE (
  profile_id uuid,
  nickname text,
  country text,
  best_score integer
) AS $$
  SELECT p.id, p.nickname, p.country, MAX(s.score)::integer AS best_score
  FROM public.game_weeks w
  JOIN public.scores s ON s.created_at >= w.week_start AND s.created_at < w.week_end AND s.status = 'verified'
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE w.id = p_week_id
  GROUP BY p.id, p.nickname, p.country
  ORDER BY best_score DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(uuid, integer) TO anon, authenticated, service_role;
