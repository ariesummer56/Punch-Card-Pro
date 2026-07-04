ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS manager_notes TEXT;

CREATE OR REPLACE FUNCTION public.validate_manager_job_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF char_length(COALESCE(NEW.manager_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'Manager notes must be 1000 characters or less';
  END IF;

  IF auth.uid() IS NOT NULL
    AND private.has_role(auth.uid(), 'manager'::public.app_role)
    AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    IF NEW.job_name IS DISTINCT FROM OLD.job_name
      OR NEW.job_description IS DISTINCT FROM OLD.job_description
      OR NEW.address IS DISTINCT FROM OLD.address
      OR NEW.city IS DISTINCT FROM OLD.city
      OR NEW.state IS DISTINCT FROM OLD.state
      OR NEW.country IS DISTINCT FROM OLD.country
      OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Managers can only update GPS pins and manager notes for jobs';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_manager_job_update_trigger ON public.jobs;
CREATE TRIGGER validate_manager_job_update_trigger
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.validate_manager_job_update();

DROP POLICY IF EXISTS "Managers can view company profiles" ON public.profiles;
CREATE POLICY "Managers can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND company_id = public.user_company_id(auth.uid())
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
      AND p.company_id = public.user_company_id(auth.uid())
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
      AND p.company_id = public.user_company_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = employee_job_assignments.job_id
      AND j.company_id = public.user_company_id(auth.uid())
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
      AND p.company_id = public.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = employee_job_assignments.employee_user_id
      AND p.company_id = public.user_company_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = employee_job_assignments.job_id
      AND j.company_id = public.user_company_id(auth.uid())
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
      AND p.company_id = public.user_company_id(auth.uid())
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
      AND p.company_id = public.user_company_id(auth.uid())
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
      AND p.company_id = public.user_company_id(auth.uid())
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = time_entries.employee_user_id
      AND p.company_id = public.user_company_id(auth.uid())
  )
);