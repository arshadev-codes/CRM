-- Quotation settings saved "globally" (for every user) from the Settings pages.
-- One table for every library (tests, instruments, equipment, exclusions, makes,
-- delivery, scope of supply / services, payment templates, major subsystems per
-- system type), on top of the built-in lists in the app's data files.
--   setting_key  the library, e.g. 'library:tests' or 'subsystems:Advanced'
--   item_id      the item; '__value__' when the whole setting is one value
--                (delivery duration options, connections mapping)
--   item set, deleted false  -> a new item, or an edited copy of a built-in one (same id)
--   deleted true             -> a built-in item removed for everyone
-- Changes saved "locally" stay in the browser that made them.
-- Replaces shared_subsystems (its rows are copied over; that table is no longer read).

CREATE TABLE public.shared_settings (
  setting_key text NOT NULL CHECK (trim(setting_key) <> ''),
  item_id text NOT NULL CHECK (trim(item_id) <> ''),
  item jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  PRIMARY KEY (setting_key, item_id),
  CHECK (deleted OR item IS NOT NULL)
);

INSERT INTO public.shared_settings (setting_key, item_id, item, deleted, updated_at, updated_by)
SELECT 'subsystems:' || system_type, item_id, item, deleted, updated_at, updated_by
FROM public.shared_subsystems
ON CONFLICT DO NOTHING;

GRANT SELECT ON public.shared_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_settings TO authenticated;
GRANT ALL ON public.shared_settings TO service_role;

ALTER TABLE public.shared_settings ENABLE ROW LEVEL SECURITY;
-- Everyone reads: the wizard and the PDF (print pages too) need it.
CREATE POLICY "read" ON public.shared_settings FOR SELECT TO anon, authenticated USING (true);
-- Anyone with access to Settings may save or remove.
CREATE POLICY "add" ON public.shared_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('settings'));
CREATE POLICY "change" ON public.shared_settings FOR UPDATE TO authenticated
  USING (public.has_perm('settings')) WITH CHECK (public.has_perm('settings'));
CREATE POLICY "remove" ON public.shared_settings FOR DELETE TO authenticated
  USING (public.has_perm('settings'));

SELECT public.audit_enable('public.shared_settings');
