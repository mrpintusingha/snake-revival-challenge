CREATE OR REPLACE FUNCTION public.increment_sponsor_click(p_bid_id uuid)
RETURNS void AS $$
  UPDATE public.sponsor_bids SET click_count = click_count + 1 WHERE id = p_bid_id;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION public.increment_sponsor_click(uuid) TO service_role;
