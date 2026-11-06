-- Per-person access, enforced by the database.
--
-- Seeing:
--   * Admins and people with the "view_all" tick (office staff) see every order.
--   * Everyone else (field staff) sees only orders where they have work: a production panel
--     assigned to them (by employee id), a production task with their name, or an order
--     stage assigned to them. Inside those orders they see their panels and tasks, the
--     Design drawings if ticked "view_design", and their panels' material if ticked
--     "view_equipment".
-- Changing: each table needs the matching section permission (admins pass all). Field staff
-- may update only the status, completion date and remarks of their own production tasks.

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.full_view() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active AND (is_admin OR 'view_all' = ANY (view_permissions))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit(perms text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active AND (is_admin OR permissions && perms)
  );
$$;

-- Anyone allowed to change at least one section.
CREATE OR REPLACE FUNCTION public.can_edit_any() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active AND (is_admin OR cardinality(permissions) > 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.my_name() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(trim(name)) FROM profiles WHERE id = auth.uid() AND active;
$$;

CREATE OR REPLACE FUNCTION public.my_panel_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT employee_id, lower(trim(name)) AS name FROM profiles WHERE id = auth.uid() AND active
  )
  SELECT p.id FROM production_panels p, me
  WHERE me.employee_id IS NOT NULL AND me.employee_id <> '' AND me.employee_id = ANY (p.assignee_ids)
  UNION
  SELECT t.panel_id FROM production_tasks t, me
  WHERE me.name <> '' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(t.assignees) = 'array' THEN t.assignees ELSE '[]'::jsonb END
    ) a WHERE lower(trim(a)) = me.name
  );
$$;

CREATE OR REPLACE FUNCTION public.my_order_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT inward_order_id FROM production_panels WHERE id IN (SELECT public.my_panel_ids())
  UNION
  SELECT inward_order_id FROM project_stages
  WHERE public.my_name() <> '' AND lower(trim(assigned_to)) = public.my_name();
$$;

CREATE OR REPLACE FUNCTION public.can_read_order(o uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.full_view() OR o IN (SELECT public.my_order_ids());
$$;

REVOKE ALL ON FUNCTION public.full_view(), public.can_edit(text[]), public.can_edit_any(),
  public.my_name(), public.my_panel_ids(), public.my_order_ids(), public.can_read_order(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.full_view(), public.can_edit(text[]), public.can_edit_any(),
  public.my_name(), public.my_panel_ids(), public.my_order_ids(), public.can_read_order(uuid)
  TO authenticated;

-- ---------- Replace the blanket "staff rw" policies ----------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND policyname = 'staff rw' LOOP
    EXECUTE format('DROP POLICY "staff rw" ON public.%I', t.tablename);
  END LOOP;
END $$;

-- Read rule + write rule per table. write_perms NULL means "anyone who can change something".
CREATE OR REPLACE FUNCTION pg_temp.secure(tbl text, read_rule text, write_rule text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('CREATE POLICY "read" ON public.%I FOR SELECT TO authenticated USING (%s)', tbl, read_rule);
  EXECUTE format('CREATE POLICY "add" ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', tbl, write_rule);
  EXECUTE format('CREATE POLICY "change" ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', tbl, write_rule, write_rule);
  EXECUTE format('CREATE POLICY "remove" ON public.%I FOR DELETE TO authenticated USING (%s)', tbl, write_rule);
END;
$$;

SELECT pg_temp.secure('projects', 'public.full_view()', $w$public.can_edit('{quotation}')$w$);
SELECT pg_temp.secure('inward_order_attachments', 'public.full_view()', $w$public.can_edit('{inward_orders}')$w$);
SELECT pg_temp.secure('inventory_items', 'public.full_view()', $w$public.can_edit('{inventory,procurement}')$w$);
SELECT pg_temp.secure('fabrication_jobs', 'public.full_view()', $w$public.can_edit('{fabrication}')$w$);
SELECT pg_temp.secure('test_items', 'public.full_view()', $w$public.can_edit('{testing,inspection}')$w$);
SELECT pg_temp.secure('qa_sessions', 'public.full_view()', $w$public.can_edit('{testing,inspection}')$w$);
SELECT pg_temp.secure('mom_points', 'public.full_view()', $w$public.can_edit('{testing,inspection}')$w$);
SELECT pg_temp.secure('inspection_outcomes', 'public.full_view()', $w$public.can_edit('{inspection}')$w$);
SELECT pg_temp.secure('dispatch_details', 'public.full_view()', $w$public.can_edit('{dispatch,inspection,testing}')$w$);
SELECT pg_temp.secure('pdi_reports', 'public.full_view()', $w$public.can_edit('{dispatch}')$w$);
SELECT pg_temp.secure('procurement_items',
  $r$public.full_view() OR (
    public.can_view('view_equipment') AND public.can_read_order(inward_order_id)
    AND (panel_id IS NULL OR panel_id IN (SELECT public.my_panel_ids()))
  )$r$,
  $w$public.can_edit('{procurement,bom}')$w$);
SELECT pg_temp.secure('stage_updates',
  $r$public.full_view() OR (
    stage_name = 'Design' AND public.can_view('view_design') AND public.can_read_order(inward_order_id)
  )$r$,
  'public.can_edit_any()');
SELECT pg_temp.secure('production_panels',
  'public.full_view() OR id IN (SELECT public.my_panel_ids())',
  $w$public.can_edit('{production,bom}')$w$);

-- Orders: dispatch/testing/inspection pages also update dates on the order.
CREATE POLICY "read" ON public.inward_orders FOR SELECT TO authenticated USING (public.can_read_order(id));
CREATE POLICY "add" ON public.inward_orders FOR INSERT TO authenticated WITH CHECK (public.can_edit('{inward_orders}'));
CREATE POLICY "change" ON public.inward_orders FOR UPDATE TO authenticated
  USING (public.can_edit('{inward_orders,dispatch,inspection,testing}'))
  WITH CHECK (public.can_edit('{inward_orders,dispatch,inspection,testing}'));
CREATE POLICY "remove" ON public.inward_orders FOR DELETE TO authenticated USING (public.can_edit('{inward_orders}'));

-- Order stages: created with the order (or on first visit by office staff), updated by anyone
-- who can change a section.
CREATE POLICY "read" ON public.project_stages FOR SELECT TO authenticated USING (public.can_read_order(inward_order_id));
CREATE POLICY "add" ON public.project_stages FOR INSERT TO authenticated
  WITH CHECK (public.full_view() OR public.can_edit('{inward_orders}'));
CREATE POLICY "change" ON public.project_stages FOR UPDATE TO authenticated
  USING (public.can_edit_any()) WITH CHECK (public.can_edit_any());
CREATE POLICY "remove" ON public.project_stages FOR DELETE TO authenticated USING (public.can_edit('{inward_orders}'));

-- Production tasks: the production team manages them; the people on a task may update it.
CREATE POLICY "read" ON public.production_tasks FOR SELECT TO authenticated
  USING (public.full_view() OR panel_id IN (SELECT public.my_panel_ids()));
CREATE POLICY "add" ON public.production_tasks FOR INSERT TO authenticated WITH CHECK (public.can_edit('{production}'));
CREATE POLICY "change" ON public.production_tasks FOR UPDATE TO authenticated
  USING (public.can_edit('{production}') OR panel_id IN (SELECT public.my_panel_ids()))
  WITH CHECK (public.can_edit('{production}') OR panel_id IN (SELECT public.my_panel_ids()));
CREATE POLICY "remove" ON public.production_tasks FOR DELETE TO authenticated USING (public.can_edit('{production}'));

-- Without the production permission only progress fields may change.
CREATE OR REPLACE FUNCTION public.guard_task_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.can_edit('{production}') THEN
    RETURN NEW;
  END IF;
  IF NEW.work IS DISTINCT FROM OLD.work OR NEW.assignees IS DISTINCT FROM OLD.assignees
     OR NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.panel_id IS DISTINCT FROM OLD.panel_id OR NEW.inward_order_id IS DISTINCT FROM OLD.inward_order_id
     OR NEW.display_order IS DISTINCT FROM OLD.display_order THEN
    RAISE EXCEPTION 'You can only change the status and remarks of your task';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_task_update BEFORE UPDATE ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_task_update();

-- DCC register: office staff only.
DROP POLICY "staff read" ON public.dcc_registry;
CREATE POLICY "read" ON public.dcc_registry FOR SELECT TO authenticated USING (public.full_view());

-- ---------- Files ----------
DROP POLICY "staff files read" ON storage.objects;
DROP POLICY "staff files insert" ON storage.objects;
DROP POLICY "staff files update" ON storage.objects;
DROP POLICY "staff files delete" ON storage.objects;
-- Paths start with the order id: <order>/stages/design/drawings/<file>.
CREATE POLICY "order files read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'inward-order-attachments' AND (
    public.full_view() OR (
      (storage.foldername(name))[2] = 'stages' AND (storage.foldername(name))[3] = 'design'
      AND public.can_view('view_design')
      AND (storage.foldername(name))[1] IN (SELECT o::text FROM public.my_order_ids() o)
    )
  )
);
CREATE POLICY "order files add" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inward-order-attachments' AND public.can_edit_any());
CREATE POLICY "order files change" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inward-order-attachments' AND public.can_edit_any())
  WITH CHECK (bucket_id = 'inward-order-attachments' AND public.can_edit_any());
CREATE POLICY "order files remove" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inward-order-attachments' AND public.can_edit_any());

-- Existing accounts keep seeing everything; new field accounts are set up without it.
UPDATE public.profiles SET view_permissions = array_append(view_permissions, 'view_all')
WHERE NOT ('view_all' = ANY (view_permissions));
