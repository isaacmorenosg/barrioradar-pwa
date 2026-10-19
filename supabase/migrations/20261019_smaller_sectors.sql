-- BarrioRadar: replace 400-metre Web Mercator radius hexagons with 200-metre ones.
-- Existing sector centers are unchanged: old axial (q,r) becomes (2q,2r).
-- Apply only once through Supabase migrations, before deploying the matching PWA.
-- The RPC accepts 400m IDs temporarily to keep old PWA tabs compatible.

DO $regrid$
DECLARE
  f record;
  sql_body text;
  needle_id text := $needle$v_id:=v_rx::text||':'||v_rz::text;$needle$;
  replace_id text := $replacement$
v_id:=v_rx::text||':'||v_rz::text;
-- Keep accepting clients with the previous 400-metre map until the PWA updates.
v_legacy_id:=v_id;
v_q:=(sqrt(3)/3*v_x-v_y/3)/200;v_r:=(2*v_y/3)/200;v_cube_y:=-v_q-v_r;
v_rx:=floor(v_q+.5)::integer;v_ry:=floor(v_cube_y+.5)::integer;v_rz:=floor(v_r+.5)::integer;
v_dx:=abs(v_rx-v_q);v_dy:=abs(v_ry-v_cube_y);v_dz:=abs(v_rz-v_r);
if v_dx>v_dy and v_dx>v_dz then v_rx:=-v_ry-v_rz;elsif v_dy>v_dz then v_ry:=-v_rx-v_rz;else v_rz:=-v_rx-v_ry;end if;
v_id:=v_rx::text||':'||v_rz::text;$replacement$;
  n_functions integer := 0;
BEGIN
  -- Do not interleave coordinate migration with an arriving review.
  LOCK TABLE public.br_reviews IN SHARE ROW EXCLUSIVE MODE;
  FOR f IN
    SELECT p.oid,p.proname,pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('br_submit_review','br_submit_review_v2')
  LOOP
    IF position(needle_id IN f.definition)=0 OR position('v_center_x:=400*sqrt(3)*' IN f.definition)=0
       OR position('v_center_y:=600*v_rz;' IN f.definition)=0
       OR position('if v_id<>p_cell_id then' IN f.definition)=0
       OR position('v_prev timestamptz;' IN f.definition)=0
    THEN RAISE EXCEPTION 'Unexpected original geometry in %; refusing unsafe regrid',f.proname; END IF;
    sql_body:=replace(f.definition,'v_prev timestamptz;','v_prev timestamptz;v_legacy_id text;');
    sql_body:=replace(sql_body,needle_id,replace_id);
    sql_body:=replace(sql_body,'if v_id<>p_cell_id then','if v_id<>p_cell_id and v_legacy_id<>p_cell_id then');
    sql_body:=replace(sql_body,'v_center_x:=400*sqrt(3)*','v_center_x:=200*sqrt(3)*');
    sql_body:=replace(sql_body,'v_center_y:=600*v_rz;','v_center_y:=300*v_rz;');
    EXECUTE sql_body;
    n_functions:=n_functions+1;
  END LOOP;
  IF n_functions<>2 THEN RAISE EXCEPTION 'Expected two review submission RPCs; got %',n_functions; END IF;

  -- Mapping is injective, so the unique (actor_id, cell_id) constraint remains valid.
  UPDATE public.br_reviews
  SET cell_id= ((split_part(cell_id,':',1)::bigint*2)::text || ':' || (split_part(cell_id,':',2)::bigint*2)::text);
END;
$regrid$;

-- New clients request exact existence at the NEW sector resolution.
CREATE OR REPLACE FUNCTION public.br_my_sector_review_v2(p_cell_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $review$
DECLARE v_actor uuid:=auth.uid();
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Sign in to check review' USING errcode='42501'; END IF;
 IF p_cell_id IS NULL OR p_cell_id !~ '^-?[0-9]{1,8}:-?[0-9]{1,8}$'
 THEN RAISE EXCEPTION 'Invalid sector' USING errcode='22023'; END IF;
 RETURN jsonb_build_object('exists',EXISTS(
   SELECT 1 FROM public.br_reviews WHERE actor_id=v_actor AND cell_id=p_cell_id));
END;
$review$;
REVOKE ALL ON FUNCTION public.br_my_sector_review_v2(text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.br_my_sector_review_v2(text) TO authenticated;

-- Old client tabs send 400m cell IDs. Preserve their edit-warning protection.
CREATE OR REPLACE FUNCTION public.br_my_sector_review(p_cell_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $review$
DECLARE v_actor uuid:=auth.uid();v_new_id text;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Sign in to check review' USING errcode='42501'; END IF;
 IF p_cell_id IS NULL OR p_cell_id !~ '^-?[0-9]{1,8}:-?[0-9]{1,8}$'
 THEN RAISE EXCEPTION 'Invalid sector' USING errcode='22023'; END IF;
 v_new_id:=(split_part(p_cell_id,':',1)::bigint*2)::text||':'||(split_part(p_cell_id,':',2)::bigint*2)::text;
 RETURN jsonb_build_object('exists',EXISTS(
   SELECT 1 FROM public.br_reviews WHERE actor_id=v_actor AND cell_id=v_new_id));
END;
$review$;
REVOKE ALL ON FUNCTION public.br_my_sector_review(text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.br_my_sector_review(text) TO authenticated;

NOTIFY pgrst,'reload schema';