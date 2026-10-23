-- Enquiries: the requirement form (RFQ) a client fills before we quote, replacing the Zoho form.
--
-- A client opens either the common link (/rfq, for the website and WhatsApp) or a personal
-- link (/rfq/<token>) made for them from the Enquiries page, which shows them their own details
-- already filled in. Clients never sign in and never touch this table: the enquiry-form Edge
-- Function checks what they send, saves it with the service role and emails the office.
--
-- status: invited (personal link sent, not filled yet) → new (submitted) → seen (opened by
--         sales) → quoted (quotation made) or closed.
-- answers: the form, by key (supabase/functions/_shared/rfqForm.ts). files: [{path, name, size}]
--         in the private "enquiry-files" bucket, under <enquiry id>/.
-- finish_key: one-time secret the function hands the browser with the upload links, so only
--         that browser can say "files are up, send the email". Cleared once used.

CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_no text UNIQUE,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('invited', 'new', 'seen', 'quoted', 'closed')),
  source text NOT NULL DEFAULT 'common' CHECK (source IN ('common', 'personal')),
  token text UNIQUE,
  company text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  files jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(files) = 'array'),
  notes text NOT NULL DEFAULT '',
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  invited_at timestamptz,
  submitted_at timestamptz,
  seen_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  seen_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  finish_key text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source = 'common' OR token IS NOT NULL)
);
CREATE INDEX enquiries_status_idx ON public.enquiries (status);
CREATE INDEX enquiries_ip_idx ON public.enquiries (ip_hash, submitted_at);
CREATE TRIGGER set_enquiries_updated_at BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_project_stage_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;
REVOKE ALL ON public.enquiries FROM anon;

-- Office staff read; sales (Quotations permission) send links, change status and delete spam.
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.enquiries FOR SELECT TO authenticated USING (public.full_view());
CREATE POLICY "add" ON public.enquiries FOR INSERT TO authenticated
  WITH CHECK (public.can_edit('{quotation}'));
CREATE POLICY "change" ON public.enquiries FOR UPDATE TO authenticated
  USING (public.can_edit('{quotation}')) WITH CHECK (public.can_edit('{quotation}'));
CREATE POLICY "remove" ON public.enquiries FOR DELETE TO authenticated
  USING (public.can_edit('{quotation}'));

-- ---------- Files the client attaches ----------
-- Private. Clients upload only through one-time signed links from the Edge Function.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('enquiry-files', 'enquiry-files', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "enquiry files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'enquiry-files' AND public.full_view());
CREATE POLICY "enquiry files remove" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'enquiry-files' AND public.can_edit('{quotation}'));

SELECT public.audit_enable('public.enquiries');
