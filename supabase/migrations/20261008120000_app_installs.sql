-- The Android app could not reliably hand its Firebase token to the site: the token sometimes
-- arrives seconds after the app opens, and later opens only resume the running app. Now each
-- app install has a random id, which it passes to the site at once ("#app_install=<id>"); the
-- token itself is sent by the app straight to the "app-device" function whenever it has one.
-- The signed-in person claims the install, so the token can come before or after sign-in.
ALTER TABLE public.device_tokens
  ADD COLUMN install_id uuid UNIQUE,
  ALTER COLUMN token DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

-- Links this phone's app to the signed-in person.
CREATE OR REPLACE FUNCTION public.claim_app_install(p_install uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_install IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO device_tokens (install_id, user_id)
  VALUES (p_install, auth.uid())
  ON CONFLICT (install_id) DO UPDATE SET user_id = auth.uid(), updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.claim_app_install(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_app_install(uuid) TO authenticated;

-- On sign-out the phone keeps its token but no longer gets this person's notifications.
CREATE OR REPLACE FUNCTION public.release_app_install(p_install uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE device_tokens SET user_id = NULL, updated_at = now()
  WHERE install_id = p_install AND user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.release_app_install(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_app_install(uuid) TO authenticated;
