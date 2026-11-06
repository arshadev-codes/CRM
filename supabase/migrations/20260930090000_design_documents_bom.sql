-- Design stage: several titled documents, each with its own revisions, plus the BOM file.
-- title: the document's name, set on its first upload ("Single Line Diagram", "GA Drawing"…).
-- document_id: groups the revisions of one document; it is the id of the first revision.
--   Older drawings have no document_id and are read as one document.
-- kind 'bom': a Bill of Materials upload; its items feed the Material Procurement list.
ALTER TABLE public.stage_updates ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.stage_updates ADD COLUMN IF NOT EXISTS document_id uuid;
ALTER TABLE public.stage_updates DROP CONSTRAINT IF EXISTS stage_updates_kind_check;
ALTER TABLE public.stage_updates
  ADD CONSTRAINT stage_updates_kind_check CHECK (kind IN ('update', 'sld', 'bom'));
CREATE INDEX IF NOT EXISTS stage_updates_document_idx ON public.stage_updates (document_id);
