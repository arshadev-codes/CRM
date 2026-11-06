-- Stage 8 after Dispatch: Commissioning & Installation at the client's site.
-- The person responsible (the stage owner) splits the site work into tasks and assigns each to
-- site engineers / technicians. They mark each task done or not done from the phone app; points
-- (on time / late / overdue) and star ratings follow from that.

CREATE TABLE public.commissioning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_order_id uuid NOT NULL REFERENCES public.inward_orders (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  -- Names for display; ids are filled from the names (same rules as production tasks).
  assignees jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignee_ids text[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in progress', 'done', 'not done')),
  completed_on date,
  -- Who confirmed the status from the site, and when (filled by the database).
  confirmed_by text NOT NULL DEFAULT '',
  confirmed_at timestamptz,
  remarks text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commissioning_tasks_order_idx ON public.commissioning_tasks (inward_order_id, display_order);
CREATE INDEX commissioning_tasks_assignee_idx ON public.commissioning_tasks USING gin (assignee_ids);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissioning_tasks TO authenticated;
GRANT ALL ON public.commissioning_tasks TO service_role;
REVOKE ALL ON public.commissioning_tasks FROM anon;

CREATE TRIGGER set_commissioning_tasks_updated_at BEFORE UPDATE ON public.commissioning_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();
-- Works on any table with assignees / assignee_ids.
CREATE TRIGGER fill_task_assignee_ids BEFORE INSERT OR UPDATE ON public.commissioning_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fill_task_assignee_ids();

-- Field staff may only change the status and remarks of their own task. A status change is
-- stamped with who made it and when.
CREATE OR REPLACE FUNCTION public.guard_commissioning_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL THEN
    NEW.confirmed_by := coalesce((SELECT name FROM profiles WHERE id = auth.uid()), '');
    NEW.confirmed_at := now();
  END IF;
  IF auth.uid() IS NULL OR public.can_edit('{commissioning}') THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.details IS DISTINCT FROM OLD.details
     OR NEW.assignees IS DISTINCT FROM OLD.assignees OR NEW.assignee_ids IS DISTINCT FROM OLD.assignee_ids
     OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.inward_order_id IS DISTINCT FROM OLD.inward_order_id
     OR NEW.display_order IS DISTINCT FROM OLD.display_order THEN
    RAISE EXCEPTION 'You can only change the status and remarks of your task';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_commissioning_update BEFORE UPDATE ON public.commissioning_tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_commissioning_update();

ALTER TABLE public.commissioning_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.commissioning_tasks FOR SELECT TO authenticated
  USING (public.full_view() OR public.my_employee_id() = ANY (assignee_ids));
CREATE POLICY "add" ON public.commissioning_tasks FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('{commissioning}'));
CREATE POLICY "change" ON public.commissioning_tasks FOR UPDATE TO authenticated
  USING (public.can_edit('{commissioning}') OR public.my_employee_id() = ANY (assignee_ids))
  WITH CHECK (public.can_edit('{commissioning}') OR public.my_employee_id() = ANY (assignee_ids));
CREATE POLICY "remove" ON public.commissioning_tasks FOR DELETE TO authenticated
  USING (public.can_edit('{commissioning}'));

-- Site staff see the orders they have site work on.
CREATE OR REPLACE FUNCTION public.my_order_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT inward_order_id FROM production_panels WHERE id IN (SELECT public.my_panel_ids())
  UNION
  SELECT inward_order_id FROM project_stages WHERE assignee_id = public.my_employee_id()
  UNION
  SELECT inward_order_id FROM commissioning_tasks WHERE public.my_employee_id() = ANY (assignee_ids);
$$;

-- A renamed employee: the names shown on their site work follow too.
CREATE OR REPLACE FUNCTION public.employee_renamed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE production_tasks t SET assignees = (
    SELECT coalesce(jsonb_agg(CASE WHEN lower(trim(a)) = lower(trim(OLD.name)) THEN NEW.name ELSE a END), '[]'::jsonb)
    FROM jsonb_array_elements_text(t.assignees) a
  )
  WHERE NEW.id = ANY (t.assignee_ids) AND jsonb_typeof(t.assignees) = 'array';
  UPDATE commissioning_tasks t SET assignees = (
    SELECT coalesce(jsonb_agg(CASE WHEN lower(trim(a)) = lower(trim(OLD.name)) THEN NEW.name ELSE a END), '[]'::jsonb)
    FROM jsonb_array_elements_text(t.assignees) a
  )
  WHERE NEW.id = ANY (t.assignee_ids) AND jsonb_typeof(t.assignees) = 'array';
  UPDATE project_stages SET assigned_to = NEW.name WHERE assignee_id = NEW.id;
  RETURN NULL;
END;
$$;

-- Notify people when site work is assigned to them.
CREATE OR REPLACE FUNCTION public.notify_commissioning_assigned() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  person record;
  project text;
BEGIN
  SELECT project_number INTO project FROM inward_orders WHERE id = NEW.inward_order_id;
  FOR person IN
    SELECT pr.id FROM profiles pr
    WHERE pr.active AND pr.employee_id = ANY (NEW.assignee_ids)
      AND (TG_OP = 'INSERT' OR NOT (pr.employee_id = ANY (OLD.assignee_ids)))
  LOOP
    PERFORM notify_user(person.id, 'assigned', 'site:' || NEW.id,
      'New site work: ' || coalesce(nullif(NEW.title, ''), 'commissioning'),
      coalesce(project, '') || ' · Commissioning & Installation: ' || NEW.title || '.',
      '/my/' || NEW.inward_order_id);
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notify_commissioning_assigned_insert AFTER INSERT ON public.commissioning_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_commissioning_assigned();
CREATE TRIGGER notify_commissioning_assigned_update AFTER UPDATE ON public.commissioning_tasks
  FOR EACH ROW WHEN (OLD.assignee_ids IS DISTINCT FROM NEW.assignee_ids)
  EXECUTE FUNCTION public.notify_commissioning_assigned();

-- Live updates on the office page when someone confirms from the site.
ALTER TABLE public.commissioning_tasks REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.commissioning_tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Existing orders get the new stage at the end.
INSERT INTO public.project_stages (inward_order_id, stage_name, display_order)
SELECT id, 'Commissioning & Installation', 8 FROM public.inward_orders
ON CONFLICT (inward_order_id, stage_name) DO NOTHING;

SELECT public.audit_enable('public.commissioning_tasks');
