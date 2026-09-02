-- Replace the weekly/tiered sponsor auction model with a standalone,
-- always-on outbid ladder: pay to take a rank, get outranked, keep your
-- spot on the list (just lower). Not tied to game weeks or player scores.

DROP VIEW IF EXISTS public.sponsor_standings;
DROP TABLE IF EXISTS public.weekly_results;
DROP TABLE IF EXISTS public.sponsor_bids;
DROP TABLE IF EXISTS public.sponsor_auctions;

CREATE TABLE public.sponsor_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_url text NOT NULL,
  category text NOT NULL,
  tagline text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT false,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsor_bids_amount_chk CHECK (amount > 0)
);
CREATE INDEX sponsor_bids_active_amount_idx ON public.sponsor_bids (amount DESC) WHERE is_active = true;
CREATE UNIQUE INDEX sponsor_bids_payment_reference_idx ON public.sponsor_bids (payment_reference) WHERE payment_reference IS NOT NULL;

-- No anon/authenticated grant on the base table: payment_reference stays
-- server-only. Public standings are exposed only through the view below.
GRANT ALL ON public.sponsor_bids TO service_role;
ALTER TABLE public.sponsor_bids ENABLE ROW LEVEL SECURITY;

CREATE VIEW public.sponsor_standings AS
SELECT
  sb.id,
  sb.link_url,
  sb.category,
  sb.tagline,
  sb.amount,
  sb.click_count,
  sb.created_at
FROM public.sponsor_bids sb
WHERE sb.is_active = true;

GRANT SELECT ON public.sponsor_standings TO anon, authenticated;

-- Atomic claim: locks the current active bids so two simultaneous claims
-- can't both win the same rank, and enforces the $1-minimum-over-current
-- rule server-side (the browser's amount is never trusted as final).
CREATE OR REPLACE FUNCTION public.claim_sponsor_bid(
  p_link_url text,
  p_category text,
  p_tagline text,
  p_amount numeric
) RETURNS public.sponsor_bids AS $$
DECLARE
    v_current_max numeric;
    v_row public.sponsor_bids;
BEGIN
    -- Serialize concurrent claims for the duration of this transaction
    -- (an aggregate can't be locked directly with SELECT ... FOR UPDATE).
    PERFORM pg_advisory_xact_lock(hashtext('sponsor_bids_claim'));

    SELECT COALESCE(MAX(amount), 0) INTO v_current_max
    FROM public.sponsor_bids
    WHERE is_active = true;

    IF p_amount < v_current_max + 1 THEN
        RAISE EXCEPTION 'Bid too low. Current top is %, minimum is %', v_current_max, v_current_max + 1;
    END IF;

    INSERT INTO public.sponsor_bids (link_url, category, tagline, amount, payment_status, is_active)
    VALUES (p_link_url, p_category, p_tagline, p_amount, 'pending', false)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.claim_sponsor_bid(text, text, text, numeric) TO service_role;
