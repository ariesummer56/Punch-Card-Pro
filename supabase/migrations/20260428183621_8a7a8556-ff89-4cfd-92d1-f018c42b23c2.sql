CREATE OR REPLACE FUNCTION private.user_company_id(_user_id UUID)
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

CREATE OR REPLACE FUNCTION private.is_company_admin(_user_id UUID, _company_id UUID)
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

REVOKE ALL ON FUNCTION private.user_company_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_company_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_company_id(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_company_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_admin_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Company users can view company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can delete company" ON public.companies;

CREATE POLICY "Company users can view company"
ON public.companies
FOR SELECT TO authenticated
USING (id = private.user_company_id(auth.uid()) OR private.is_company_admin(auth.uid(), id));

CREATE POLICY "Company admins can update company"
ON public.companies
FOR UPDATE TO authenticated
USING (private.is_company_admin(auth.uid(), id))
WITH CHECK (private.is_company_admin(auth.uid(), id));

CREATE POLICY "Company admins can delete company"
ON public.companies
FOR DELETE TO authenticated
USING (private.is_company_admin(auth.uid(), id));