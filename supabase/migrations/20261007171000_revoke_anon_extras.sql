-- Default grants gave anon access to the newer tables; RLS already hid the rows.
REVOKE ALL ON public.audit_log, public.profiles FROM anon;
