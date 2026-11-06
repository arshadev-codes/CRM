-- A new drawing notification was held back for 5 minutes per order, so a second document
-- (e.g. a Wiring Diagram right after the SLD) never reached the phone. Now each document is
-- counted on its own, and only a repeat upload of the same document within 1 minute is skipped.
CREATE OR REPLACE FUNCTION public.notify_drawing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  person uuid;
  project text;
  doc text := coalesce(nullif(trim(NEW.title), ''), NEW.file_name, 'Design');
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
    PERFORM notify_user(person, 'drawing', 'drawing:' || NEW.inward_order_id || ':' || lower(doc),
      'New drawing: ' || doc,
      coalesce(project, '') || ' · A drawing was uploaded. Use the latest revision.',
      '/my/' || NEW.inward_order_id, interval '1 minute');
  END LOOP;
  RETURN NULL;
END;
$$;
