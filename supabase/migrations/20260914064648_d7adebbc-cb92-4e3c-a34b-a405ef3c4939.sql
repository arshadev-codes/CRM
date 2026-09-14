CREATE TABLE public.inward_orders (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_number text NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  po_number text,
  po_date date,
  due_date date,
  supervisor text NOT NULL,
  qa_officer text NOT NULL,
  readiness_date date NOT NULL,
  inspection_date date,
  dispatch_date date,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inward_orders TO authenticated;
GRANT ALL ON public.inward_orders TO service_role;
ALTER TABLE public.inward_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.inward_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);