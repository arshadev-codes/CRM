-- Dispatch Clearance Code (DCC): a random code given to each panel when its PDI is submitted.
-- Every code ever issued stays in dcc_registry for good (no delete, no update from the app),
-- so a code used once is never handed out again, even if the order or report is removed.
CREATE TABLE public.dcc_registry (
  dcc text PRIMARY KEY CHECK (dcc ~ '^DCC-[2-9A-HJKMNP-Z]{6}$'),
  pdi_report_id uuid NOT NULL UNIQUE,
  inward_order_id uuid,
  project_number text NOT NULL DEFAULT '',
  panel_serial text NOT NULL DEFAULT '',
  issued_at timestamptz NOT NULL DEFAULT now(),
  emailed_at timestamptz,
  email_error text
);

GRANT SELECT ON public.dcc_registry TO anon, authenticated;
GRANT ALL ON public.dcc_registry TO service_role;
ALTER TABLE public.dcc_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.dcc_registry FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.pdi_reports
  ADD COLUMN dcc text UNIQUE,
  ADD COLUMN dcc_emailed_at timestamptz;

-- Returns the report's DCC, issuing a new random one the first time. 31 characters
-- (no 0/O, 1/I/L) in 6 places gives ~88 crore codes; a clash is simply retried.
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

REVOKE ALL ON FUNCTION public.issue_dcc(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_dcc(uuid, uuid, text, text) TO anon, authenticated;
