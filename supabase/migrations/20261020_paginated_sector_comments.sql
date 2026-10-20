-- BarrioRadar: read all publicly moderated sector comments without exposing emails.
-- Applies to all historical approved comments (rating aggregates remain last 180 days).
CREATE OR REPLACE FUNCTION public.br_sector_comments(
  p_cell_id text,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_total integer;
  v_items jsonb;
BEGIN
  IF p_cell_id IS NULL OR p_cell_id !~ '^-?[0-9]{1,8}:-?[0-9]{1,8}$'
     OR p_offset IS NULL OR p_offset < 0 OR p_offset > 2000000
     OR p_limit IS NULL OR p_limit < 1 OR p_limit > 50
  THEN
    RAISE EXCEPTION 'Invalid comment page' USING errcode='22023';
  END IF;
  SELECT count(*) INTO v_total
  FROM public.br_reviews r
  WHERE r.cell_id=p_cell_id AND r.status='approved'
    AND r.comment_text IS NOT NULL AND btrim(r.comment_text)<>'';
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'text',c.comment_text, 'created_at',c.created_at
  ) ORDER BY c.created_at DESC,c.id DESC),'[]'::jsonb)
  INTO v_items
  FROM (
    SELECT r.id,r.comment_text,r.created_at
    FROM public.br_reviews r
    WHERE r.cell_id=p_cell_id AND r.status='approved'
      AND r.comment_text IS NOT NULL AND btrim(r.comment_text)<>''
    ORDER BY r.created_at DESC,r.id DESC
    LIMIT p_limit OFFSET p_offset
  ) c;
  RETURN jsonb_build_object('comments',v_items,'total',v_total,
    'has_more',(p_offset + jsonb_array_length(v_items) < v_total));
END;
$function$;
REVOKE ALL ON FUNCTION public.br_sector_comments(text,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.br_sector_comments(text,integer,integer)
  TO anon,authenticated;
COMMENT ON FUNCTION public.br_sector_comments(text,integer,integer)
  IS 'Public approved sector comments, paginated, no identities';
NOTIFY pgrst,'reload schema';
