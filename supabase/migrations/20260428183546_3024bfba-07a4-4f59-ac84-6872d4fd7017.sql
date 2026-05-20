CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_admin_user_id UUID NOT NULL UNIQUE,
  contact_email TEXT,
  contact_phone TEXT,
  admin_alert_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS company_role TEXT;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE public.company_weekly_report_settings
  ADD COLUMN IF NOT EXISTS company_id UUID;

CREATE OR REPLACE FUNCTION public.user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.company_id = _company_id
      AND private.has_role(_user_id, 'admin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.complete_admin_onboarding(
  _company_name TEXT,
  _display_name TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL,
  _contact_email TEXT DEFAULT NULL,
  _admin_alert_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _company_id UUID;
  _email TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF length(trim(_company_name)) < 2 OR length(trim(_company_name)) > 140 THEN
    RAISE EXCEPTION 'Company name must be between 2 and 140 characters';
  END IF;

  SELECT email INTO _email
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;

  INSERT INTO public.companies (name, owner_admin_user_id, contact_email, contact_phone, admin_alert_email)
  VALUES (trim(_company_name), _user_id, COALESCE(_contact_email, _email), _phone, COALESCE(_admin_alert_email, _contact_email, _email))
  ON CONFLICT (owner_admin_user_id) DO UPDATE
    SET name = EXCLUDED.name,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        admin_alert_email = EXCLUDED.admin_alert_email,
        updated_at = now()
  RETURNING id INTO _company_id;

  UPDATE public.profiles
  SET company_id = _company_id,
      company_name = trim(_company_name),
      company_role = 'admin',
      display_name = COALESCE(NULLIF(trim(_display_name), ''), display_name),
      phone = COALESCE(NULLIF(trim(_phone), ''), phone),
      email = COALESCE(email, _contact_email),
      admin_alert_email = COALESCE(_admin_alert_email, _contact_email, admin_alert_email, email),
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _company_id;
END;
$$;

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Admins can create own company" ON public.companies;
DROP POLICY IF EXISTS "Company users can view company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can delete company" ON public.companies;

CREATE POLICY "Admins can create own company"
ON public.companies
FOR INSERT TO authenticated
WITH CHECK (owner_admin_user_id = auth.uid());

CREATE POLICY "Company users can view company"
ON public.companies
FOR SELECT TO authenticated
USING (id = public.user_company_id(auth.uid()) OR public.is_company_admin(auth.uid(), id));

CREATE POLICY "Company admins can update company"
ON public.companies
FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), id))
WITH CHECK (public.is_company_admin(auth.uid(), id));

CREATE POLICY "Company admins can delete company"
ON public.companies
FOR DELETE TO authenticated
USING (public.is_company_admin(auth.uid(), id));

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_company_weekly_report_settings_company_id ON public.company_weekly_report_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_owner_admin ON public.companies(owner_admin_user_id);