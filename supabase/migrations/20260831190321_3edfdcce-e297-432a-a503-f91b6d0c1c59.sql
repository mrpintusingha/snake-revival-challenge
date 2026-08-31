
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  country text,
  secret_hash text NOT NULL,
  best_score integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_best_score_idx ON public.profiles (best_score DESC);
CREATE INDEX profiles_country_idx ON public.profiles (country, best_score DESC);
CREATE UNIQUE INDEX profiles_secret_hash_idx ON public.profiles (secret_hash);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'dodo',
  provider_payment_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  attempts_total integer NOT NULL DEFAULT 3,
  attempts_used integer NOT NULL DEFAULT 0,
  challenge_code text,
  test_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_provider_payment_id_idx ON public.payments (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payments_profile_idx ON public.payments (profile_id);
CREATE INDEX payments_created_idx ON public.payments (created_at DESC);

CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  session_token_hash text NOT NULL,
  game_version text NOT NULL DEFAULT '1.0.0',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  score integer,
  status text NOT NULL DEFAULT 'active',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX game_sessions_token_idx ON public.game_sessions (session_token_hash);
CREATE INDEX game_sessions_payment_idx ON public.game_sessions (payment_id);
CREATE INDEX game_sessions_started_idx ON public.game_sessions (started_at DESC);

CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_session_id uuid REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  score integer NOT NULL,
  status text NOT NULL DEFAULT 'verified',
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE UNIQUE INDEX scores_session_idx ON public.scores (game_session_id);
CREATE INDEX scores_score_idx ON public.scores (score DESC);
CREATE INDEX scores_profile_idx ON public.scores (profile_id, created_at DESC);

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenger_score integer NOT NULL,
  challenge_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  opens integer NOT NULL DEFAULT 0,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_score integer,
  completed_at timestamptz
);
CREATE INDEX challenges_challenger_idx ON public.challenges (challenger_id);
CREATE INDEX challenges_created_idx ON public.challenges (created_at DESC);

CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  threshold integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, achievement_id)
);

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_created_idx ON public.activity_events (created_at DESC);

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.scores TO anon, authenticated;
GRANT SELECT ON public.challenges TO anon, authenticated;
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT SELECT ON public.player_achievements TO anon, authenticated;
GRANT SELECT ON public.activity_events TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.game_sessions TO service_role;
GRANT ALL ON public.scores TO service_role;
GRANT ALL ON public.challenges TO service_role;
GRANT ALL ON public.achievements TO service_role;
GRANT ALL ON public.player_achievements TO service_role;
GRANT ALL ON public.activity_events TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read verified scores" ON public.scores FOR SELECT TO anon, authenticated USING (status = 'verified');
CREATE POLICY "public read challenges" ON public.challenges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read achievements" ON public.achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read player achievements" ON public.player_achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read activity" ON public.activity_events FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.achievements (name, description, threshold) VALUES
  ('Snake Rookie', 'Scored under 500', 0),
  ('Nokia Kid', 'Scored 500 or more', 500),
  ('Snake Player', 'Scored 1,500 or more', 1500),
  ('Snake Master', 'Scored 3,000 or more', 3000),
  ('Snake Legend', 'Scored 5,000 or more', 5000),
  ('90s Final Boss', 'Scored 10,000 or more', 10000);
