-- Remarks on production work as a history: each remark is its own row with who wrote it and
-- when, so several people on one panel no longer overwrite each other. production_tasks.remarks
-- keeps the latest one for older pages.

CREATE TABLE public.production_task_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.production_tasks (id) ON DELETE CASCADE,
  inward_order_id uuid NOT NULL,
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_task_remarks_task_idx ON public.production_task_remarks (task_id, created_at);
CREATE INDEX production_task_remarks_order_idx ON public.production_task_remarks (inward_order_id);

GRANT SELECT, INSERT, DELETE ON public.production_task_remarks TO authenticated;
GRANT ALL ON public.production_task_remarks TO service_role;
REVOKE ALL ON public.production_task_remarks FROM anon;

-- The writer and the order are always taken from the database, never from the page.
CREATE OR REPLACE FUNCTION public.stamp_task_remark() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT inward_order_id INTO NEW.inward_order_id FROM production_tasks WHERE id = NEW.task_id;
  IF auth.uid() IS NOT NULL THEN
    NEW.author_id := auth.uid();
    NEW.author_name := coalesce((SELECT name FROM profiles WHERE id = auth.uid()), '');
    NEW.created_at := now();
  END IF;
  NEW.body := trim(NEW.body);
  RETURN NEW;
END;
$$;
CREATE TRIGGER stamp_task_remark BEFORE INSERT ON public.production_task_remarks
  FOR EACH ROW EXECUTE FUNCTION public.stamp_task_remark();

-- Keep the task's single remarks field showing the newest remark.
CREATE OR REPLACE FUNCTION public.latest_task_remark() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  task uuid := coalesce(NEW.task_id, OLD.task_id);
BEGIN
  UPDATE production_tasks SET remarks = coalesce((
    SELECT body FROM production_task_remarks WHERE task_id = task ORDER BY created_at DESC LIMIT 1
  ), '')
  WHERE id = task;
  RETURN NULL;
END;
$$;
CREATE TRIGGER latest_task_remark AFTER INSERT OR DELETE ON public.production_task_remarks
  FOR EACH ROW EXECUTE FUNCTION public.latest_task_remark();

ALTER TABLE public.production_task_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.production_task_remarks FOR SELECT TO authenticated USING (
  public.full_view()
  OR task_id IN (SELECT id FROM production_tasks WHERE panel_id IN (SELECT public.my_panel_ids()))
);
CREATE POLICY "add" ON public.production_task_remarks FOR INSERT TO authenticated WITH CHECK (
  public.can_edit('{production}')
  OR task_id IN (SELECT id FROM production_tasks WHERE panel_id IN (SELECT public.my_panel_ids()))
);
-- People remove their own remarks; the production team can remove any.
CREATE POLICY "remove" ON public.production_task_remarks FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.can_edit('{production}'));

-- Existing remarks become the first entry, credited to whoever wrote them (from the activity log).
INSERT INTO public.production_task_remarks (task_id, inward_order_id, author_id, author_name, body, created_at)
SELECT t.id, t.inward_order_id, a.actor_id, coalesce(a.actor_name, ''), t.remarks, coalesce(a.at, t.updated_at)
FROM public.production_tasks t
LEFT JOIN LATERAL (
  SELECT actor_id, actor_name, at FROM public.audit_log
  WHERE table_name = 'production_tasks' AND record_id = t.id::text
    AND changes -> 'remarks' ->> 'to' = t.remarks
  ORDER BY at DESC LIMIT 1
) a ON true
WHERE trim(t.remarks) <> '';

SELECT public.audit_enable('public.production_task_remarks');
