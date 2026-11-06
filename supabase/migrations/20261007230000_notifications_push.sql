-- Notifications for the phone app. Database triggers write a row in "notifications" when
-- something concerns a person; every new row is pushed to that person's phones by the
-- "push-send" Edge Function (web push). The function URL and shared secret live in Vault
-- (secrets "push_function_url" and "push_secret"), set outside this file.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT '',
  dedupe_key text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '/my',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_dedupe_idx ON public.notifications (user_id, dedupe_key, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
REVOKE ALL ON public.notifications FROM anon;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own mark read" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
REVOKE ALL ON public.push_subscriptions FROM anon;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- A phone signed in as someone else is moved to the new person.
CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_agent text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(p_agent, ''))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
$$;
REVOKE ALL ON FUNCTION public.save_push_subscription(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) TO authenticated;

-- Writes one notification, unless the same thing was already sent to this person recently.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user uuid, p_kind text, p_key text, p_title text, p_body text, p_link text,
  p_window interval DEFAULT interval '10 minutes'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL OR p_user = auth.uid() THEN
    RETURN; -- nobody needs a notification about their own change
  END IF;
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = p_user AND dedupe_key = p_key AND created_at > now() - p_window
  ) THEN
    RETURN;
  END IF;
  INSERT INTO notifications (user_id, kind, dedupe_key, title, body, link)
  VALUES (p_user, p_kind, p_key, p_title, coalesce(p_body, ''), coalesce(p_link, '/my'));
END;
$$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text, text, interval) FROM PUBLIC, anon, authenticated;

-- People working on an order: assigned to one of its panels, or named on one of its tasks.
CREATE OR REPLACE FUNCTION public.order_people(p_order uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.id FROM profiles pr
  WHERE pr.active AND (
    EXISTS (SELECT 1 FROM production_panels p
            WHERE p.inward_order_id = p_order AND pr.employee_id IS NOT NULL
              AND pr.employee_id = ANY (p.assignee_ids))
    OR EXISTS (SELECT 1 FROM production_tasks t, jsonb_array_elements_text(
                 CASE WHEN jsonb_typeof(t.assignees) = 'array' THEN t.assignees ELSE '[]'::jsonb END) a
               WHERE t.inward_order_id = p_order AND lower(trim(a)) = lower(trim(pr.name)))
  );
$$;
REVOKE ALL ON FUNCTION public.order_people(uuid) FROM PUBLIC, anon, authenticated;

-- ---------- What triggers a notification ----------

-- 1. A panel is assigned to someone.
CREATE OR REPLACE FUNCTION public.notify_panel_assigned() RETURNS trigger
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
    PERFORM notify_user(person.id, 'assigned', 'assign:' || NEW.id,
      'New work: ' || NEW.panel_type,
      coalesce(project, '') || ' · You are assigned to the ' || NEW.panel_type || ' panel.',
      '/my/' || NEW.inward_order_id);
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notify_panel_assigned AFTER INSERT OR UPDATE OF assignee_ids ON public.production_panels
  FOR EACH ROW EXECUTE FUNCTION public.notify_panel_assigned();

-- 2. Someone is named on a task (panel-level assignment above wins within 10 minutes).
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
    SELECT pr.id FROM profiles pr, jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(NEW.assignees) = 'array' THEN NEW.assignees ELSE '[]'::jsonb END) a
    WHERE pr.active AND lower(trim(a)) = lower(trim(pr.name))
      AND (TG_OP = 'INSERT' OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(OLD.assignees) = 'array' THEN OLD.assignees ELSE '[]'::jsonb END) b
        WHERE lower(trim(b)) = lower(trim(pr.name))))
  LOOP
    PERFORM notify_user(person.id, 'assigned', 'assign:' || NEW.panel_id,
      'New work: ' || coalesce(panel, 'panel'),
      coalesce(project, '') || ' · ' || NEW.work || ' on ' || coalesce(panel, 'a panel') || '.',
      '/my/' || NEW.inward_order_id);
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notify_task_assigned AFTER INSERT OR UPDATE OF assignees ON public.production_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- 3. A new drawing (or revision) is uploaded in Design.
CREATE OR REPLACE FUNCTION public.notify_drawing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  person uuid;
  project text;
BEGIN
  IF NEW.stage_name <> 'Design' OR NEW.kind = 'bom' OR NEW.storage_path IS NULL
     OR (storage.foldername(NEW.storage_path))[4] IS DISTINCT FROM 'drawings' THEN
    RETURN NULL;
  END IF;
  SELECT project_number INTO project FROM inward_orders WHERE id = NEW.inward_order_id;
  FOR person IN
    SELECT o.p FROM order_people(NEW.inward_order_id) AS o(p)
    JOIN profiles pr ON pr.id = o.p
    WHERE pr.is_admin OR 'view_design' = ANY (pr.view_permissions) OR 'view_all' = ANY (pr.view_permissions)
  LOOP
    PERFORM notify_user(person, 'drawing', 'drawing:' || NEW.inward_order_id,
      'New drawing: ' || coalesce(nullif(NEW.title, ''), NEW.file_name, 'Design'),
      coalesce(project, '') || ' · A drawing was uploaded. Use the latest revision.',
      '/my/' || NEW.inward_order_id, interval '5 minutes');
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notify_drawing AFTER INSERT ON public.stage_updates
  FOR EACH ROW EXECUTE FUNCTION public.notify_drawing();

-- 4. Material for someone's panel becomes available.
CREATE OR REPLACE FUNCTION public.notify_material_ready() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  person record;
  panel record;
  was_ready boolean := coalesce(OLD.qty_in_stock, 0) + OLD.qty_received >= OLD.qty_required;
  now_ready boolean := coalesce(NEW.qty_in_stock, 0) + NEW.qty_received >= NEW.qty_required;
BEGIN
  IF NEW.panel_id IS NULL OR was_ready OR NOT now_ready THEN
    RETURN NULL;
  END IF;
  SELECT p.panel_type, p.assignee_ids, o.project_number INTO panel
  FROM production_panels p JOIN inward_orders o ON o.id = p.inward_order_id WHERE p.id = NEW.panel_id;
  FOR person IN
    SELECT pr.id FROM profiles pr
    WHERE pr.active AND pr.employee_id = ANY (panel.assignee_ids)
      AND (pr.is_admin OR 'view_equipment' = ANY (pr.view_permissions) OR 'view_all' = ANY (pr.view_permissions))
  LOOP
    PERFORM notify_user(person.id, 'material', 'material:' || NEW.panel_id,
      'Material available: ' || panel.panel_type,
      coalesce(panel.project_number, '') || ' · ' || NEW.item_name || ' is now available.',
      '/my/' || NEW.inward_order_id, interval '30 minutes');
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notify_material_ready AFTER UPDATE OF qty_in_stock, qty_received, qty_required ON public.procurement_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_material_ready();

-- ---------- Push every new notification ----------
CREATE OR REPLACE FUNCTION public.push_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  url text;
  secret text;
BEGIN
  SELECT decrypted_secret INTO url FROM vault.decrypted_secrets WHERE name = 'push_function_url';
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'push_secret';
  IF url IS NULL OR secret IS NULL THEN
    RETURN NULL; -- push not set up: the notification still shows inside the app
  END IF;
  PERFORM net.http_post(
    url := url,
    body := jsonb_build_object('notification_id', NEW.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret)
  );
  RETURN NULL;
END;
$$;
CREATE TRIGGER push_notification AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_notification();

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
