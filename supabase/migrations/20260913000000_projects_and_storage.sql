-- Quotations (projects) and the file bucket. These used to be created by hand (quotations in a
-- separate project, the bucket in the dashboard); now every table lives in one database.
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  offer_base text,       -- e.g. "Q001/2025-26/Neo/TTS"
  offer_seq int,         -- 1, 2, 3 ... (auto-increment per FY)
  fy text,               -- "2025-26"
  company_short text,    -- "Neo"
  revision int NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_offer_seq_idx ON public.projects (fy, offer_seq);
CREATE INDEX IF NOT EXISTS projects_parent_idx ON public.projects (parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Private bucket for order attachments, design documents and stage files (signed URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('inward-order-attachments', 'inward-order-attachments', false)
ON CONFLICT (id) DO NOTHING;
