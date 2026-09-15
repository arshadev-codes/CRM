ALTER TABLE public.inward_orders DROP CONSTRAINT IF EXISTS inward_orders_status_check;
ALTER TABLE public.inward_orders ADD CONSTRAINT inward_orders_status_check CHECK (status IN ('Open', 'In Progress', 'Completed', 'Closed'));

CREATE TABLE public.project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'not started' CHECK (status IN ('not started', 'in progress', 'done')),
  assigned_to text NOT NULL DEFAULT '',
  remarks text NOT NULL DEFAULT '',
  expected_date date,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inward_order_id, stage_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_stages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_stages TO authenticated;
GRANT ALL ON public.project_stages TO service_role;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.project_stages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.inward_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  content_type text,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_order_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_order_attachments TO authenticated;
GRANT ALL ON public.inward_order_attachments TO service_role;
ALTER TABLE public.inward_order_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.inward_order_attachments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_project_stage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_project_stage_updated_at
BEFORE UPDATE ON public.project_stages
FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();

CREATE OR REPLACE FUNCTION public.create_default_project_stages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_stages (inward_order_id, stage_name, display_order)
  VALUES
    (NEW.id, 'Design', 1),
    (NEW.id, 'Fabrication', 2),
    (NEW.id, 'Material Procurement', 3),
    (NEW.id, 'Production', 4),
    (NEW.id, 'Testing', 5),
    (NEW.id, 'Inspection', 6),
    (NEW.id, 'Dispatch', 7)
  ON CONFLICT (inward_order_id, stage_name) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_default_project_stages
AFTER INSERT ON public.inward_orders
FOR EACH ROW EXECUTE FUNCTION public.create_default_project_stages();