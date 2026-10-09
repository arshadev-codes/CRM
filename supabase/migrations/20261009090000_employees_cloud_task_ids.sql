-- Employees and their ratings move from each browser into the database, and work is
-- assigned by employee id instead of by name.
--
-- * employees / employee_ratings: one shared list for every computer. Office staff see all;
--   field staff see only themselves.
-- * production_tasks.assignee_ids and project_stages.assignee_id hold employee ids. The names
--   stay for display. When only names are sent (older pages), the ids are filled in from the
--   names; a renamed employee keeps their work and the stored names follow the new name.
-- * Access (my_panel_ids, my_order_ids), notifications and order_people now follow the ids.

-- ---------- Tables ----------
CREATE TABLE public.employees (
  id text PRIMARY KEY,
  name text NOT NULL,
  designation text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'workshop' CHECK (scope IN ('quotation', 'workshop')),
  phone text,
  department text,
  joined_on date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER set_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();

CREATE TABLE public.employee_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  rated_by text NOT NULL DEFAULT '',
  task_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_ratings_employee_idx ON public.employee_ratings (employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees, public.employee_ratings TO authenticated;
GRANT ALL ON public.employees, public.employee_ratings TO service_role;
REVOKE ALL ON public.employees, public.employee_ratings FROM anon;

-- The people every browser started with.
INSERT INTO public.employees (id, name, designation, scope) VALUES
  ('jmk', 'J.M. Krishna', 'Sales Engineer', 'quotation'),
  ('sb', 'Sabir Baig', 'Technical Manager', 'quotation'),
  ('vk', 'V. Kumar', 'Project Lead', 'quotation'),
  ('ap', 'A. Pawar', 'Design Engineer', 'quotation'),
  ('rahul-pawar', 'Rahul Pawar', '', 'workshop'),
  ('anees-shaikh', 'Anees Shaikh', '', 'workshop'),
  ('mubin-shaikh', 'Mubin Shaikh', '', 'workshop'),
  ('saud-chaudhary', 'Saud Chaudhary', '', 'workshop'),
  ('fardin-shaikh', 'Fardin Shaikh', '', 'workshop'),
  ('mushtaque-shaikh', 'Mushtaque Shaikh', '', 'workshop'),
  ('farhaan-shaikh', 'Farhaan Shaikh', '', 'workshop'),
  ('shahebaz-shaikh', 'Shahebaz Shaikh', '', 'workshop'),
  ('nazeel-shaikh', 'Nazeel Shaikh', '', 'workshop'),
  ('nizam-shaikh', 'Nizam Shaikh', '', 'workshop'),
  ('sufiyan-kotawdekar', 'Sufiyan Kotawdekar', '', 'workshop'),
  ('sufiyan-shaikh', 'Sufiyan Shaikh', '', 'workshop'),
  ('aabid-shaikh', 'Aabid Shaikh', '', 'workshop'),
  ('amaan-khan', 'Amaan Khan', '', 'workshop')
ON CONFLICT (id) DO NOTHING;

-- ---------- Access ----------
CREATE OR REPLACE FUNCTION public.my_employee_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(employee_id, '') FROM profiles WHERE id = auth.uid() AND active;
$$;
REVOKE ALL ON FUNCTION public.my_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_employee_id() TO authenticated;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.employees FOR SELECT TO authenticated
  USING (public.full_view() OR id = public.my_employee_id());
CREATE POLICY "add" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('{employees,settings,quotation}'));
CREATE POLICY "change" ON public.employees FOR UPDATE TO authenticated
  USING (public.can_edit('{employees,settings,quotation}'))
  WITH CHECK (public.can_edit('{employees,settings,quotation}'));
CREATE POLICY "remove" ON public.employees FOR DELETE TO authenticated
  USING (public.can_edit('{employees,settings,quotation}'));

ALTER TABLE public.employee_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.employee_ratings FOR SELECT TO authenticated
  USING (public.full_view() OR employee_id = public.my_employee_id());
CREATE POLICY "add" ON public.employee_ratings FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('{employees}'));
CREATE POLICY "change" ON public.employee_ratings FOR UPDATE TO authenticated
  USING (public.can_edit('{employees}')) WITH CHECK (public.can_edit('{employees}'));
CREATE POLICY "remove" ON public.employee_ratings FOR DELETE TO authenticated
  USING (public.can_edit('{employees}'));

-- ---------- Ids on work ----------
ALTER TABLE public.production_tasks ADD COLUMN assignee_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.project_stages ADD COLUMN assignee_id text;

-- Employee ids for a list of names. Where two employees share a name, the ones already in
-- `keep` win, so re-saving a task never swaps one person for their namesake.
CREATE OR REPLACE FUNCTION public.employee_ids_for(names jsonb, keep text[] DEFAULT '{}')
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH wanted AS (
    SELECT DISTINCT lower(trim(a)) AS k
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(names) = 'array' THEN names ELSE '[]'::jsonb END) a
  ), found AS (
    SELECT e.id, e.id = ANY (keep) AS kept,
           bool_or(e.id = ANY (keep)) OVER (PARTITION BY lower(trim(e.name))) AS name_kept
    FROM employees e JOIN wanted w ON w.k = lower(trim(e.name))
  )
  SELECT coalesce(array_agg(id ORDER BY id), '{}') FROM found WHERE kept OR NOT name_kept;
$$;
REVOKE ALL ON FUNCTION public.employee_ids_for(jsonb, text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fill_task_assignee_ids() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF cardinality(NEW.assignee_ids) = 0 THEN
      NEW.assignee_ids := employee_ids_for(NEW.assignees);
    END IF;
  ELSIF NEW.assignees IS DISTINCT FROM OLD.assignees
        AND NEW.assignee_ids IS NOT DISTINCT FROM OLD.assignee_ids THEN
    NEW.assignee_ids := employee_ids_for(NEW.assignees, OLD.assignee_ids);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fill_task_assignee_ids BEFORE INSERT OR UPDATE ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fill_task_assignee_ids();

CREATE OR REPLACE FUNCTION public.fill_stage_assignee_id() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ids text[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    RETURN NEW; -- the page sent the id itself
  END IF;
  ids := employee_ids_for(jsonb_build_array(NEW.assigned_to),
           CASE WHEN TG_OP = 'UPDATE' AND OLD.assignee_id IS NOT NULL THEN ARRAY[OLD.assignee_id] ELSE '{}' END);
  NEW.assignee_id := CASE WHEN cardinality(ids) = 1 THEN ids[1] END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fill_stage_assignee_id BEFORE INSERT OR UPDATE ON public.project_stages
  FOR EACH ROW EXECUTE FUNCTION public.fill_stage_assignee_id();

-- A renamed employee: the names shown on their work follow.
CREATE OR REPLACE FUNCTION public.employee_renamed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE production_tasks t SET assignees = (
    SELECT coalesce(jsonb_agg(CASE WHEN lower(trim(a)) = lower(trim(OLD.name)) THEN NEW.name ELSE a END), '[]'::jsonb)
    FROM jsonb_array_elements_text(t.assignees) a
  )
  WHERE NEW.id = ANY (t.assignee_ids) AND jsonb_typeof(t.assignees) = 'array';
  UPDATE project_stages SET assigned_to = NEW.name WHERE assignee_id = NEW.id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER employee_renamed AFTER UPDATE OF name ON public.employees
  FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.employee_renamed();

-- Existing work.
UPDATE public.production_tasks SET assignee_ids = public.employee_ids_for(assignees);
UPDATE public.project_stages SET assigned_to = assigned_to WHERE assigned_to <> '';

-- Field staff still may not change who a task belongs to.
CREATE OR REPLACE FUNCTION public.guard_task_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.can_edit('{production}') THEN
    RETURN NEW;
  END IF;
  IF NEW.work IS DISTINCT FROM OLD.work OR NEW.assignees IS DISTINCT FROM OLD.assignees
     OR NEW.assignee_ids IS DISTINCT FROM OLD.assignee_ids
     OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.panel_id IS DISTINCT FROM OLD.panel_id OR NEW.inward_order_id IS DISTINCT FROM OLD.inward_order_id
     OR NEW.display_order IS DISTINCT FROM OLD.display_order THEN
    RAISE EXCEPTION 'You can only change the status and remarks of your task';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- Access and notifications by id ----------
CREATE OR REPLACE FUNCTION public.my_panel_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM production_panels p WHERE public.my_employee_id() = ANY (p.assignee_ids)
  UNION
  SELECT t.panel_id FROM production_tasks t WHERE public.my_employee_id() = ANY (t.assignee_ids);
$$;

CREATE OR REPLACE FUNCTION public.my_order_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT inward_order_id FROM production_panels WHERE id IN (SELECT public.my_panel_ids())
  UNION
  SELECT inward_order_id FROM project_stages WHERE assignee_id = public.my_employee_id();
$$;

CREATE OR REPLACE FUNCTION public.order_people(p_order uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.id FROM profiles pr
  WHERE pr.active AND nullif(pr.employee_id, '') IS NOT NULL AND (
    EXISTS (SELECT 1 FROM production_panels p
            WHERE p.inward_order_id = p_order AND pr.employee_id = ANY (p.assignee_ids))
    OR EXISTS (SELECT 1 FROM production_tasks t
               WHERE t.inward_order_id = p_order AND pr.employee_id = ANY (t.assignee_ids))
  );
$$;

CREATE OR REPLACE FUNCTION public.notify_task_assigned() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  person record;
  panel text;
  project text;
BEGIN
  SELECT p.panel_type, o.project_number INTO panel, project
  FROM production_panels p JOIN inward_orders o ON o.id = p.inward_order_id WHERE p.id = NEW.panel_id;
  FOR person IN
    SELECT pr.id FROM profiles pr
    WHERE pr.active AND pr.employee_id = ANY (NEW.assignee_ids)
      AND (TG_OP = 'INSERT' OR NOT (pr.employee_id = ANY (OLD.assignee_ids)))
  LOOP
    PERFORM notify_user(person.id, 'assigned', 'assign:' || NEW.panel_id,
      'New work: ' || coalesce(panel, 'panel'),
      coalesce(project, '') || ' · ' || NEW.work || ' on ' || coalesce(panel, 'a panel') || '.',
      '/my/' || NEW.inward_order_id);
  END LOOP;
  RETURN NULL;
END;
$$;
-- The ids may be filled in by the trigger above, so watch the row, not the SET list.
DROP TRIGGER notify_task_assigned ON public.production_tasks;
CREATE TRIGGER notify_task_assigned_insert AFTER INSERT ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();
CREATE TRIGGER notify_task_assigned_update AFTER UPDATE ON public.production_tasks
  FOR EACH ROW WHEN (OLD.assignee_ids IS DISTINCT FROM NEW.assignee_ids)
  EXECUTE FUNCTION public.notify_task_assigned();

SELECT public.audit_enable('public.employees');
SELECT public.audit_enable('public.employee_ratings');
