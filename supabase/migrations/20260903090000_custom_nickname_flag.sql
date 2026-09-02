-- Distinguishes an auto-assigned fun nickname (given at first play, zero
-- friction) from one a player actually chose, so the leaderboard always has
-- a presentable name and the "customize your name" prompt only shows once.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_custom_nickname boolean NOT NULL DEFAULT false;

-- Backfill: anyone who already has a non-default nickname got it through the
-- old explicit-entry flow, so it counts as customized.
UPDATE public.profiles SET has_custom_nickname = true WHERE nickname <> 'Player';
