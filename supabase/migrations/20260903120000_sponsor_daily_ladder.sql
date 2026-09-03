-- A second, daily-resetting sponsor ladder alongside the existing always-on
-- one: businesses can claim #1 "today" for a fraction of the all-time
-- price, and that slate wipes at UTC midnight every day. Both ladders share
-- the same sponsor_bids table (and therefore click tracking + the payment
-- webhook keep working unchanged) — a ladder_type discriminator plus a
-- slot_date keep the two pools of rows unambiguous.

ALTER TABLE public.sponsor_bids
  ADD COLUMN ladder_type text NOT NULL DEFAULT 'all_time'
    CHECK (ladder_type IN ('all_time', 'daily')),
  ADD COLUMN slot_date date;

ALTER TABLE public.sponsor_bids
  ADD CONSTRAINT sponsor_bids_slot_date_chk
    CHECK ((ladder_type = 'daily') = (slot_date IS NOT NULL));

DROP INDEX IF EXISTS sponsor_bids_active_amount_idx;
CREATE INDEX sponsor_bids_active_amount_alltime_idx
  ON public.sponsor_bids (amount DESC)
  WHERE is_active = true AND ladder_type = 'all_time';
CREATE INDEX sponsor_bids_active_amount_daily_idx
  ON public.sponsor_bids (slot_date, amount DESC)
  WHERE is_active = true AND ladder_type = 'daily';

CREATE OR REPLACE VIEW public.sponsor_standings AS
SELECT
  sb.id,
  sb.link_url,
  sb.category,
  sb.tagline,
  sb.amount,
  sb.click_count,
  sb.created_at
FROM public.sponsor_bids sb
WHERE sb.is_active = true AND sb.ladder_type = 'all_time';

CREATE VIEW public.sponsor_standings_daily AS
SELECT
  sb.id,
  sb.link_url,
  sb.category,
  sb.tagline,
  sb.amount,
  sb.click_count,
  sb.created_at
FROM public.sponsor_bids sb
WHERE sb.is_active = true AND sb.ladder_type = 'daily' AND sb.slot_date = CURRENT_DATE;

GRANT SELECT ON public.sponsor_standings_daily TO anon, authenticated;

-- Signature changed (new ladder param) — drop the old 4-arg overload before
-- recreating so it doesn't linger alongside the new one.
DROP FUNCTION IF EXISTS public.claim_sponsor_bid(text, text, text, numeric);

CREATE OR REPLACE FUNCTION public.claim_sponsor_bid(
  p_link_url text,
  p_category text,
  p_tagline text,
  p_amount numeric,
  p_ladder_type text DEFAULT 'all_time'
) RETURNS public.sponsor_bids AS $$
DECLARE
    v_current_max numeric;
    v_slot_date date;
    v_row public.sponsor_bids;
BEGIN
    IF p_ladder_type NOT IN ('all_time', 'daily') THEN
        RAISE EXCEPTION 'Invalid ladder type %', p_ladder_type;
    END IF;
    v_slot_date := CASE WHEN p_ladder_type = 'daily' THEN CURRENT_DATE ELSE NULL END;

    -- Serialize concurrent claims for the duration of this transaction, per
    -- ladder (+ date for daily) so the two ladders never block each other.
    PERFORM pg_advisory_xact_lock(hashtext('sponsor_bids_claim:' || p_ladder_type || COALESCE(v_slot_date::text, '')));

    SELECT COALESCE(MAX(amount), 0) INTO v_current_max
    FROM public.sponsor_bids
    WHERE is_active = true
      AND ladder_type = p_ladder_type
      AND (p_ladder_type = 'all_time' OR slot_date = v_slot_date);

    IF p_amount < v_current_max + 1 THEN
        RAISE EXCEPTION 'Bid too low. Current top is %, minimum is %', v_current_max, v_current_max + 1;
    END IF;

    INSERT INTO public.sponsor_bids (link_url, category, tagline, amount, payment_status, is_active, ladder_type, slot_date)
    VALUES (p_link_url, p_category, p_tagline, p_amount, 'pending', false, p_ladder_type, v_slot_date)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.claim_sponsor_bid(text, text, text, numeric, text) TO service_role;
