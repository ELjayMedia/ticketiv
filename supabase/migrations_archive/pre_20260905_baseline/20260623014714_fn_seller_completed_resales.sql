CREATE OR REPLACE FUNCTION public.fn_seller_completed_resales(p_seller_ids uuid[])
RETURNS TABLE(seller_id uuid, completed_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    rl.seller_id,
    COUNT(*)::bigint AS completed_count
  FROM public.resale_listings rl
  WHERE rl.seller_id = ANY(p_seller_ids)
    AND rl.status = 'completed'
  GROUP BY rl.seller_id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_seller_completed_resales(uuid[]) TO authenticated, anon;;
