-- Password register: the admin wants every login's password readable.
-- Supabase Auth keeps only a locked (hashed) copy, so the "admin-users" function also writes
-- the plain password here whenever the admin creates a login or sets a new password.
-- Only admins can read it; nobody can write it from the website (the function uses the
-- service role). Passwords set before this register existed are not known until reset.

CREATE TABLE public.password_register (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.password_register TO authenticated;
GRANT ALL ON public.password_register TO service_role;
REVOKE ALL ON public.password_register FROM anon;

ALTER TABLE public.password_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.password_register FOR SELECT TO authenticated
  USING (public.is_admin());

SELECT public.audit_enable('public.password_register');
