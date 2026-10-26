CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled contract',
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  header_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  body_content text NOT NULL DEFAULT '',
  editable_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  footer_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed')),
  signing_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  signature_data text,
  signer_ip text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_admin_idx ON public.contracts(admin_id);
CREATE INDEX IF NOT EXISTS contracts_token_idx ON public.contracts(signing_token);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT SELECT, UPDATE ON public.contracts TO anon;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins select own contracts" ON public.contracts FOR SELECT TO authenticated USING (auth.uid() = admin_id);
CREATE POLICY "Admins insert own contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admins update own contracts" ON public.contracts FOR UPDATE TO authenticated USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admins delete own contracts" ON public.contracts FOR DELETE TO authenticated USING (auth.uid() = admin_id);

CREATE POLICY "Public select contract by token" ON public.contracts FOR SELECT TO anon USING (signing_token IS NOT NULL AND status IN ('sent', 'viewed', 'signed'));
CREATE POLICY "Public update contract before signed" ON public.contracts FOR UPDATE TO anon USING (signing_token IS NOT NULL AND status != 'signed') WITH CHECK (status IN ('viewed', 'signed'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS contracts_touch ON public.contracts;
CREATE TRIGGER contracts_touch BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
