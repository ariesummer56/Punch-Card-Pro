
-- Helper: get a job's company_id, bypassing RLS
CREATE OR REPLACE FUNCTION private.job_company_id(_job_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT company_id FROM public.jobs WHERE id = _job_id $$;

-- Helper: is a user assigned to a job, bypassing RLS
CREATE OR REPLACE FUNCTION private.is_assigned_to_job(_user_id uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee_job_assignments
    WHERE job_id = _job_id AND employee_user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION private.job_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_assigned_to_job(uuid, uuid) TO authenticated;

-- Rewrite jobs SELECT policy for employees
DROP POLICY IF EXISTS "Employees can view assigned jobs" ON public.jobs;
CREATE POLICY "Employees can view assigned jobs"
ON public.jobs FOR SELECT TO authenticated
USING (private.is_assigned_to_job(auth.uid(), id));

-- Rewrite employee_job_assignments policies to avoid cross-table EXISTS that re-trigger RLS
DROP POLICY IF EXISTS "Admins can view company assignments" ON public.employee_job_assignments;
CREATE POLICY "Admins can view company assignments"
ON public.employee_job_assignments FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can create company assignments admin" ON public.employee_job_assignments;
CREATE POLICY "Admins can create company assignments admin"
ON public.employee_job_assignments FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can update company assignments admin" ON public.employee_job_assignments;
CREATE POLICY "Admins can update company assignments admin"
ON public.employee_job_assignments FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete company assignments admin" ON public.employee_job_assignments;
CREATE POLICY "Admins can delete company assignments admin"
ON public.employee_job_assignments FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers can view company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can view company assignments"
ON public.employee_job_assignments FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers can create company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can create company assignments"
ON public.employee_job_assignments FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can update company assignments"
ON public.employee_job_assignments FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
)
WITH CHECK (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
  AND private.job_company_id(job_id) = private.user_company_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete company assignments" ON public.employee_job_assignments;
CREATE POLICY "Managers can delete company assignments"
ON public.employee_job_assignments FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'manager'::public.app_role)
  AND private.user_company_id(employee_user_id) = private.user_company_id(auth.uid())
);
