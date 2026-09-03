-- claim_sponsor_bid required every new bid to beat the ladder's all-time max
-- amount, treating this as a single "#1 slot" auction. But the board is a
-- real multi-slot ranked list (sponsor_standings sorts *all* active bids by
-- amount DESC, and nothing ever deactivates a row except being outbid down
-- the ranking — see the webhook, which only ever sets is_active=true).
--
-- That mismatch meant every "Claim this rank for $X" click on any row other
-- than #1 was guaranteed to fail: the UI would offer, say, $16 to take rank
-- #13, and the RPC would reject it with "Bid too low" because $16 doesn't
-- beat the actual #1 price (often far higher). Only claims aimed at #1 ever
-- succeeded. Fix: a new bid just needs a sane positive amount — it lands
-- wherever it naturally sorts among the other active bids, exactly as the
-- "nobody is ever removed, they just rank lower once outbid" model intends.
DROP FUNCTION IF EXISTS public.claim_sponsor_bid(text, text, text, numeric, text);

CREATE OR REPLACE FUNCTION public.claim_sponsor_bid(
  p_link_url text,
  p_category text,
  p_tagline text,
  p_amount numeric,
  p_ladder_type text DEFAULT 'all_time'
) RETURNS public.sponsor_bids AS $$
DECLARE
    v_slot_date date;
    v_row public.sponsor_bids;
BEGIN
    IF p_ladder_type NOT IN ('all_time', 'daily') THEN
        RAISE EXCEPTION 'Invalid ladder type %', p_ladder_type;
    END IF;
    IF p_amount < 1 THEN
        RAISE EXCEPTION 'Bid must be at least 1';
    END IF;
    v_slot_date := CASE WHEN p_ladder_type = 'daily' THEN CURRENT_DATE ELSE NULL END;

    -- Serializes concurrent claims per ladder (+ date for daily). No longer
    -- gates on the current max, but still keeps claim inserts one-at-a-time
    -- for this ladder so nothing else added later has to worry about races.
    PERFORM pg_advisory_xact_lock(hashtext('sponsor_bids_claim:' || p_ladder_type || COALESCE(v_slot_date::text, '')));

    INSERT INTO public.sponsor_bids (link_url, category, tagline, amount, payment_status, is_active, ladder_type, slot_date)
    VALUES (p_link_url, p_category, p_tagline, p_amount, 'pending', false, p_ladder_type, v_slot_date)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.claim_sponsor_bid(text, text, text, numeric, text) TO service_role;
