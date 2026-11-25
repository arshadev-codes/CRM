-- Major Sub Systems saved "for future use" in Settings: shared by every user and kept
-- permanently, on top of the built-in list in the app's data files.
--   item set, deleted false  -> a new subsystem, or an edited copy of a built-in one (same id)
--   deleted true             -> a built-in subsystem removed for everyone
-- Edits saved "for now" stay in the browser that made them, as before.

CREATE TABLE public.shared_subsystems (
  system_type text NOT NULL CHECK (system_type IN ('Advanced', 'SemiAutomatic', 'Conventional', 'FullyAutomatic')),
  item_id text NOT NULL CHECK (trim(item_id) <> ''),
  item jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  PRIMARY KEY (system_type, item_id),
  CHECK (deleted OR item IS NOT NULL)
);

GRANT SELECT ON public.shared_subsystems TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_subsystems TO authenticated;
GRANT ALL ON public.shared_subsystems TO service_role;

ALTER TABLE public.shared_subsystems ENABLE ROW LEVEL SECURITY;
-- Everyone reads the list: the wizard and the PDF (print pages too) need it.
CREATE POLICY "read" ON public.shared_subsystems FOR SELECT TO anon, authenticated USING (true);
-- Anyone with access to Settings may save or remove.
CREATE POLICY "add" ON public.shared_subsystems FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('settings'));
CREATE POLICY "change" ON public.shared_subsystems FOR UPDATE TO authenticated
  USING (public.has_perm('settings')) WITH CHECK (public.has_perm('settings'));
CREATE POLICY "remove" ON public.shared_subsystems FOR DELETE TO authenticated
  USING (public.has_perm('settings'));

SELECT public.audit_enable('public.shared_subsystems');
