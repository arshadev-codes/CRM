-- Timeline of updates for each inward-order stage (Design first).
-- A row is either a written update ('update') or a drawing upload ('sld').
-- The newest 'sld' row for a stage is the drawing shown on the stage page.
CREATE TABLE public.stage_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  kind text NOT NULL DEFAULT 'update' CHECK (kind IN ('update', 'sld')),
  author text NOT NULL DEFAULT '',
  remarks text NOT NULL DEFAULT '',
  status text CHECK (status IS NULL OR status IN ('not started', 'in progress', 'done')),
  file_name text,
  storage_path text UNIQUE,
  content_type text,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stage_updates_order_stage_idx ON public.stage_updates (inward_order_id, stage_name, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_updates TO authenticated;
GRANT ALL ON public.stage_updates TO service_role;
ALTER TABLE public.stage_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.stage_updates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Live updates on the stage page.
ALTER TABLE public.stage_updates REPLICA IDENTITY FULL;
ALTER TABLE public.project_stages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_updates;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_stages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
