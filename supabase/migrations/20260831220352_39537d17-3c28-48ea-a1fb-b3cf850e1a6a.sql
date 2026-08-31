ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_seed text NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex');

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS game_sessions_profile_idx ON public.game_sessions (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS game_sessions_created_idx ON public.game_sessions (created_at DESC);

ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS global_rank integer;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS country_rank integer;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS verification_status text GENERATED ALWAYS AS (status) STORED;
CREATE INDEX IF NOT EXISTS scores_status_idx ON public.scores (status, score DESC);

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'created';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days');
CREATE INDEX IF NOT EXISTS challenges_accepted_idx ON public.challenges (accepted_by);
CREATE INDEX IF NOT EXISTS activity_events_profile_idx ON public.activity_events (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON public.admin_actions (created_at DESC);