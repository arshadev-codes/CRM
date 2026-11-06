-- Phones running the Electrosoft Android app. The app gets its own Firebase (FCM) token and
-- hands it to the web page; push-send then delivers straight to the app, so a notification
-- arrives even when Chrome is asleep in the background.
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_tokens_user_idx ON public.device_tokens (user_id);
GRANT SELECT, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;
REVOKE ALL ON public.device_tokens FROM anon;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices" ON public.device_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- A phone signed in as someone else is moved to the new person.
CREATE OR REPLACE FUNCTION public.save_device_token(p_token text, p_platform text DEFAULT 'android')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(trim(p_token), '') = '' THEN
    RETURN;
  END IF;
  INSERT INTO device_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, coalesce(p_platform, 'android'))
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(), platform = excluded.platform, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.save_device_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_device_token(text, text) TO authenticated;

SELECT public.audit_enable('public.device_tokens');
