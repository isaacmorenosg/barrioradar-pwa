-- BarrioRadar: unrestricted number of sectors, unlimited revisions of the same
-- sector, but only one current row per actor_id+cell_id. Apply after creating
-- br_reviews and br_submit_review/br_submit_review_v2 in the main schema.
-- The existing unique constraint on (actor_id,cell_id) must stay in place.
DO $migration$
DECLARE
  f record;
  body text;
  older_5 text := 'if not found and (select count(*) from public.br_reviews where actor_id=v_actor)>=5 then raise exception ''Has alcanzado el limite total de 5 zonas valoradas para este correo.'' using errcode=''22023'';end if;';
  older_10 text := 'if not found and (select count(*) from public.br_reviews where actor_id=v_actor and created_at>=now()-interval ''24 hours'')>=10 then raise exception ''Daily limit reached'' using errcode=''22023'';end if;';
BEGIN
  FOR f IN
    SELECT p.oid,p.proname,pg_get_functiondef(p.oid) definition
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE n.nspname='public' AND p.proname IN ('br_submit_review','br_submit_review_v2')
  LOOP
    body := replace(replace(f.definition,older_5,''),older_10,'');
    IF body <> f.definition THEN EXECUTE body; END IF;
  END LOOP;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.br_my_sector_review(p_cell_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to check review' USING errcode='42501';
  END IF;
  IF p_cell_id IS NULL OR p_cell_id !~ '^-?[0-9]{1,8}:-?[0-9]{1,8}$' THEN
    RAISE EXCEPTION 'Invalid sector' USING errcode='22023';
  END IF;
  RETURN jsonb_build_object('exists',EXISTS(
    SELECT 1 FROM public.br_reviews WHERE actor_id=v_actor AND cell_id=p_cell_id
  ));
END; $$;
REVOKE ALL ON FUNCTION public.br_my_sector_review(text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.br_my_sector_review(text) TO authenticated;
NOTIFY pgrst,'reload schema';
