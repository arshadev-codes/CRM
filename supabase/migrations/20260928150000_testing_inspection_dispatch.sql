-- Testing & Inspection: sessions (visits/days), the test checklist and minutes of meeting.
-- A session of kind 'joint' covers testing and client inspection together.
CREATE TABLE public.qa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'testing' CHECK (kind IN ('testing', 'inspection', 'joint')),
  title text NOT NULL DEFAULT '',
  session_date date,
  start_time text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  -- [{ "name": "...", "role": "Engineer" }]
  team jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "name": "...", "designation": "...", "company": "...", "phone": "..." }]
  client_attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in progress', 'completed', 'cancelled')),
  summary text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qa_sessions_order_idx ON public.qa_sessions (inward_order_id, session_date);

CREATE TABLE public.test_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  -- Id from the tests master when loaded from the quotation; NULL for tests added by hand.
  test_key text,
  title text NOT NULL,
  test_group text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in progress', 'passed', 'failed', 'retest')),
  result_notes text NOT NULL DEFAULT '',
  tested_by text NOT NULL DEFAULT '',
  session_id uuid REFERENCES public.qa_sessions(id) ON DELETE SET NULL,
  witness_status text NOT NULL DEFAULT '' CHECK (witness_status IN ('', 'witnessed', 'accepted', 'rejected')),
  witness_remarks text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inward_order_id, test_key)
);

CREATE TABLE public.mom_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.qa_sessions(id) ON DELETE CASCADE,
  point_type text NOT NULL DEFAULT 'note' CHECK (point_type IN ('test_result', 'problem', 'client_request', 'client_concern', 'decision', 'note')),
  description text NOT NULL DEFAULT '',
  cause text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at timestamptz,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mom_points_order_idx ON public.mom_points (inward_order_id, session_id);

-- Inspection outcome is kept per order (the latest decision after all visits).
CREATE TABLE public.inspection_outcomes (
  inward_order_id uuid PRIMARY KEY REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  outcome text NOT NULL DEFAULT '' CHECK (outcome IN ('', 'accepted', 'accepted_with_remarks', 'rejected')),
  remarks text NOT NULL DEFAULT '',
  decided_by text NOT NULL DEFAULT '',
  decided_at timestamptz,
  report_name text,
  report_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dispatch: one record per order, filled in step by step.
CREATE TABLE public.dispatch_details (
  inward_order_id uuid PRIMARY KEY REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  planned_date date,
  incharge text NOT NULL DEFAULT '',
  milestone text NOT NULL DEFAULT 'planned' CHECK (milestone IN ('planned', 'packed', 'loaded', 'in transit', 'delivered')),
  packing_date date,
  packing_type text NOT NULL DEFAULT '',
  packages_count integer,
  gross_weight_kg numeric,
  dimensions text NOT NULL DEFAULT '',
  transport_mode text NOT NULL DEFAULT '',
  transporter text NOT NULL DEFAULT '',
  vehicle_no text NOT NULL DEFAULT '',
  driver_name text NOT NULL DEFAULT '',
  driver_phone text NOT NULL DEFAULT '',
  lr_number text NOT NULL DEFAULT '',
  eway_bill_no text NOT NULL DEFAULT '',
  invoice_no text NOT NULL DEFAULT '',
  insurance text NOT NULL DEFAULT '',
  loading_method text NOT NULL DEFAULT '',
  dispatched_on date,
  destination text NOT NULL DEFAULT '',
  site_contact text NOT NULL DEFAULT '',
  site_phone text NOT NULL DEFAULT '',
  expected_delivery date,
  delivered_on date,
  received_by text NOT NULL DEFAULT '',
  delivery_remarks text NOT NULL DEFAULT '',
  -- { "test_certificates": true, ... }
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['qa_sessions', 'test_items', 'mom_points', 'inspection_outcomes', 'dispatch_details'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "public rw" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at()', t, t);
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;
