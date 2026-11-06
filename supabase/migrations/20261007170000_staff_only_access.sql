-- Lock the database before the site goes public: without signing in (anon) nothing can be
-- read or written. Signed-in, active staff keep full access to the app tables, as before;
-- per-section edit rights and "only my assigned orders" come in later migrations.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'public rw'
  LOOP
    EXECUTE format('DROP POLICY "public rw" ON public.%I', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.tablename);
    EXECUTE format(
      'CREATE POLICY "staff rw" ON public.%I FOR ALL TO authenticated
         USING (public.is_staff()) WITH CHECK (public.is_staff())',
      t.tablename);
  END LOOP;
END $$;

-- DCC codes: staff only, and only staff may issue one.
DROP POLICY "public read" ON public.dcc_registry;
REVOKE ALL ON public.dcc_registry FROM anon;
CREATE POLICY "staff read" ON public.dcc_registry FOR SELECT TO authenticated USING (public.is_staff());
REVOKE EXECUTE ON FUNCTION public.issue_dcc(uuid, uuid, text, text) FROM anon;

-- issue_dcc runs as its owner, so it checks the caller itself.
CREATE OR REPLACE FUNCTION public.issue_dcc(
  p_report_id uuid,
  p_order_id uuid,
  p_project text DEFAULT '',
  p_serial text DEFAULT ''
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  existing text;
  candidate text;
  bytes bytea;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Sign in to issue a DCC';
  END IF;
  SELECT dcc INTO existing FROM dcc_registry WHERE pdi_report_id = p_report_id;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  LOOP
    bytes := uuid_send(gen_random_uuid());
    candidate := 'DCC-';
    FOR i IN 0..5 LOOP
      candidate := candidate || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    END LOOP;
    BEGIN
      INSERT INTO dcc_registry (dcc, pdi_report_id, inward_order_id, project_number, panel_serial)
      VALUES (candidate, p_report_id, p_order_id, coalesce(p_project, ''), coalesce(p_serial, ''));
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Same report issued at the same moment from another tab: hand back that code.
      SELECT dcc INTO existing FROM dcc_registry WHERE pdi_report_id = p_report_id;
      IF existing IS NOT NULL THEN
        RETURN existing;
      END IF;
      -- Otherwise the random code was already taken: try another.
    END;
  END LOOP;

  UPDATE pdi_reports SET dcc = candidate WHERE id = p_report_id;
  RETURN candidate;
END;
$$;

-- Files: staff only.
DROP POLICY "inward attachments read" ON storage.objects;
DROP POLICY "inward attachments insert" ON storage.objects;
DROP POLICY "inward attachments update" ON storage.objects;
DROP POLICY "inward attachments delete" ON storage.objects;
CREATE POLICY "staff files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inward-order-attachments' AND public.is_staff());
CREATE POLICY "staff files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inward-order-attachments' AND public.is_staff());
CREATE POLICY "staff files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inward-order-attachments' AND public.is_staff())
  WITH CHECK (bucket_id = 'inward-order-attachments' AND public.is_staff());
CREATE POLICY "staff files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inward-order-attachments' AND public.is_staff());
