-- Allow signed-in users to execute helper functions used by access rules, while keeping anonymous access blocked.
REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.user_company_id(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_company_admin(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_company_admin(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.user_company_id(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_admin(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID, UUID) TO authenticated;

-- Make the public compatibility helpers delegate to the protected internal helpers.
CREATE OR REPLACE FUNCTION public.user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.user_company_id(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.is_company_admin(_user_id, _company_id)
$$;

-- Keep onboarding secure, and ensure it works with the current one-role-per-user constraint.
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
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN _company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_admin_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_admin_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Align company-scoped manager policies with helper functions that signed-in users can execute.
DROP POLICY IF EXISTS "Managers can view company profiles" ON public.profiles;
CREATE POLICY "Managers can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND company_id = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers can view company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can view company assignments"
ON public.employee_job_assignments
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can create company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can create company assignments"
ON public.employee_job_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = employee_job_assignments.job_id
      AND j.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can update company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can update company assignments"
ON public.employee_job_assignments
FOR UPDATE
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = employee_job_assignments.job_id
      AND j.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can delete company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can delete company assignments"
ON public.employee_job_assignments
FOR DELETE
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can view company time entries" ON public.time_entries;
CREATE POLICY "Managers can view company time entries"
ON public.time_entries
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can update company time entries" ON public.time_entries;
CREATE POLICY "Managers can update company time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = private.user_company_id(auth.uid())
  )
);