-- Anyone allowed to change a section (quotations, production, ...) is office staff:
-- they see every order and the full website, not only the field app.
-- Matches isOfficeUser() in src/store/authStore.ts.
CREATE OR REPLACE FUNCTION public.full_view() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active
      AND (is_admin OR 'view_all' = ANY (view_permissions) OR cardinality(permissions) > 0)
  );
$$;
