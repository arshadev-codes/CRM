-- Activity log: every insert, update and delete on every app table is written here by a
-- trigger, with who did it. Only admins can read it; nobody can change or delete entries
-- from the app. Quick repeat saves of the same record by the same person (autosave) are
-- folded into one entry for 2 minutes, keeping the first "from" value.
CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete', 'event')),
  table_name text NOT NULL,
  record_id text,
  order_id text,
  label text NOT NULL DEFAULT '',
  changes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_log_at_idx ON public.audit_log (at DESC);
CREATE INDEX audit_log_actor_idx ON public.audit_log (actor_id, at DESC);
CREATE INDEX audit_log_record_idx ON public.audit_log (table_name, record_id, at DESC);
CREATE INDEX audit_log_order_idx ON public.audit_log (order_id, at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin());

-- {key: {from, to}} for every changed key. Nested objects (like a quotation's "data" or
-- PDI "responses") are compared one level down, so only the parts that changed are kept.
CREATE OR REPLACE FUNCTION public.audit_diff(a jsonb, b jsonb, nested boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  k text;
BEGIN
  FOR k IN SELECT DISTINCT key FROM (
    SELECT jsonb_object_keys(coalesce(a, '{}'::jsonb)) AS key
    UNION SELECT jsonb_object_keys(coalesce(b, '{}'::jsonb))
  ) keys LOOP
    IF k = 'updated_at' OR a -> k IS NOT DISTINCT FROM b -> k THEN
      CONTINUE;
    END IF;
    IF nested AND jsonb_typeof(a -> k) = 'object' AND jsonb_typeof(b -> k) = 'object' THEN
      result := result || jsonb_build_object(k, public.audit_diff(a -> k, b -> k, false));
    ELSE
      result := result || jsonb_build_object(k, jsonb_build_object('from', a -> k, 'to', b -> k));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- Folds a newer diff into an older one: keeps the oldest "from", takes the newest "to".
CREATE OR REPLACE FUNCTION public.audit_merge(older jsonb, newer jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result jsonb := coalesce(older, '{}'::jsonb);
  k text;
  o jsonb;
  n jsonb;
BEGIN
  FOR k IN SELECT jsonb_object_keys(coalesce(newer, '{}'::jsonb)) LOOP
    o := result -> k;
    n := newer -> k;
    IF o IS NULL THEN
      result := result || jsonb_build_object(k, n);
    ELSIF n ? 'to' AND o ? 'from' THEN
      result := result || jsonb_build_object(k, jsonb_build_object('from', o -> 'from', 'to', n -> 'to'));
    ELSE
      result := result || jsonb_build_object(k, public.audit_merge(o, n));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  who text := '';
  old_j jsonb;
  new_j jsonb;
  row_j jsonb;
  diff jsonb;
  rec text;
  recent bigint;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_j := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_j := to_jsonb(NEW); END IF;
  row_j := coalesce(new_j, old_j);
  rec := coalesce(row_j ->> 'id', row_j ->> 'inward_order_id', row_j ->> 'dcc');

  IF TG_OP = 'UPDATE' THEN
    diff := public.audit_diff(old_j, new_j);
    IF diff = '{}'::jsonb THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'INSERT' THEN
    diff := jsonb_build_object('row', new_j);
  ELSE
    diff := jsonb_build_object('row', old_j);
  END IF;

  IF actor IS NOT NULL THEN
    SELECT coalesce(nullif(name, ''), username) INTO who FROM profiles WHERE id = actor;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT id INTO recent FROM audit_log
    WHERE table_name = TG_TABLE_NAME AND record_id = rec AND action = 'update'
      AND actor_id IS NOT DISTINCT FROM actor AND at > now() - interval '2 minutes'
    ORDER BY at DESC LIMIT 1;
    IF recent IS NOT NULL THEN
      UPDATE audit_log SET at = now(), changes = public.audit_merge(changes, diff) WHERE id = recent;
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO audit_log (actor_id, actor_name, action, table_name, record_id, order_id, label, changes)
  VALUES (
    actor,
    coalesce(who, ''),
    lower(TG_OP),
    TG_TABLE_NAME,
    rec,
    CASE WHEN TG_TABLE_NAME = 'inward_orders' THEN row_j ->> 'id' ELSE row_j ->> 'inward_order_id' END,
    left(coalesce(
      nullif(row_j ->> 'project_number', ''), nullif(row_j ->> 'name', ''),
      nullif(row_j ->> 'item_name', ''), nullif(row_j ->> 'panel_serial', ''),
      nullif(row_j ->> 'title', ''), nullif(row_j ->> 'file_name', ''),
      nullif(row_j ->> 'stage_name', ''), nullif(row_j ->> 'username', ''), ''
    ), 200),
    diff
  );
  RETURN NULL;
END;
$$;

-- Attach the trigger to a table. New tables should call this in their migration.
CREATE OR REPLACE FUNCTION public.audit_enable(t regclass) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON %s', t);
  EXECUTE format(
    'CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON %s
       FOR EACH ROW EXECUTE FUNCTION public.audit_capture()', t);
END;
$$;
REVOKE ALL ON FUNCTION public.audit_enable(regclass) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'audit_log' LOOP
    PERFORM public.audit_enable(format('public.%I', t.tablename)::regclass);
  END LOOP;
END $$;

-- Events that are not row changes (sign in, sign out, PDF download, ...).
CREATE OR REPLACE FUNCTION public.log_event(event text, details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  who text := '';
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT coalesce(nullif(name, ''), username) INTO who FROM profiles WHERE id = auth.uid();
  INSERT INTO audit_log (actor_id, actor_name, action, table_name, label, changes)
  VALUES (auth.uid(), coalesce(who, ''), 'event', 'event', left(event, 100), coalesce(details, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.log_event(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_event(text, jsonb) TO authenticated;
