-- Pre-Dispatch Inspection (PDI) reports: one per panel, filled in on the Dispatch page before
-- the panel is packed. The inspector signs in with name + email (verified by a code).
-- responses: { "mech_a_1": true, "gland_2": "ok", "ops_3": "na", "ip54_1": "yes", ... }
CREATE TABLE public.pdi_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  inspector_name text NOT NULL DEFAULT '',
  inspector_email text NOT NULL DEFAULT '',
  email_verified_at timestamptz,
  customer_name text NOT NULL DEFAULT '',
  project_number text NOT NULL DEFAULT '',
  panel_serial text NOT NULL DEFAULT '',
  panel_name text NOT NULL DEFAULT '',
  panel_category text NOT NULL DEFAULT 'electrical'
    CHECK (panel_category IN ('electrical', 'automation')),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  remarks text NOT NULL DEFAULT '',
  declared boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pdi_reports_order_idx ON public.pdi_reports (inward_order_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdi_reports TO anon, authenticated;
GRANT ALL ON public.pdi_reports TO service_role;
ALTER TABLE public.pdi_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.pdi_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_pdi_reports_updated_at BEFORE UPDATE ON public.pdi_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();
ALTER TABLE public.pdi_reports REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pdi_reports;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
