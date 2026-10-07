-- Staff sign-in with Supabase Auth. Each login has a profile that holds what the person may
-- change (permissions) and see (view_permissions). Accounts are created only by an admin,
-- through the "admin-users" Edge Function; staff sign in as <username>@staff.local.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._-]{2,32}$'),
  name text NOT NULL DEFAULT '',
  employee_id text,
  is_admin boolean NOT NULL DEFAULT false,
  permissions text[] NOT NULL DEFAULT '{}',
  view_permissions text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_employee_idx ON public.profiles (employee_id);

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();

-- Helpers for database rules. SECURITY DEFINER so they can read profiles under RLS.
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active AND is_admin);
$$;

CREATE OR REPLACE FUNCTION public.has_perm(p text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active AND (is_admin OR p = ANY (permissions))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view(p text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active AND (is_admin OR p = ANY (view_permissions))
  );
$$;

-- True until the first admin account exists; the login page then offers first-time setup.
CREATE OR REPLACE FUNCTION public.auth_setup_needed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM profiles);
$$;

REVOKE ALL ON FUNCTION public.is_staff(), public.is_admin(), public.has_perm(text),
  public.can_view(text), public.auth_setup_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(), public.is_admin(), public.has_perm(text),
  public.can_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_setup_needed() TO anon, authenticated;

-- Everyone signed in can read profiles (names for lists); only the Edge Function writes.
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
