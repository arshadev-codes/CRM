-- Fabrication: each order goes out for fabrication first, then for powder coating.
-- One row per batch sent out: who it was given to, when, when it is due back, when it arrived.
CREATE TABLE public.fabrication_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'fabrication' CHECK (phase IN ('fabrication', 'powder_coating')),
  description text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  given_by text NOT NULL DEFAULT '',
  given_on date,
  expected_on date,
  received_on date,
  received_by text NOT NULL DEFAULT '',
  remarks text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fabrication_jobs_order_idx ON public.fabrication_jobs (inward_order_id, phase, display_order);

-- Production: an order is split into panels (Console, Test Bench, RIO Panel, ...).
CREATE TABLE public.production_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  panel_type text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  notes text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_panels_order_idx ON public.production_panels (inward_order_id, display_order);

-- Each panel has its own list of work (Mounting, Cut out, Wiring, ...), each with planned dates
-- and one or more assigned employees.
CREATE TABLE public.production_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  panel_id uuid NOT NULL REFERENCES public.production_panels(id) ON DELETE CASCADE,
  work text NOT NULL DEFAULT '',
  assignees jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in progress', 'done')),
  completed_on date,
  remarks text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_tasks_order_idx ON public.production_tasks (inward_order_id, panel_id, display_order);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fabrication_jobs', 'production_panels', 'production_tasks'] LOOP
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
