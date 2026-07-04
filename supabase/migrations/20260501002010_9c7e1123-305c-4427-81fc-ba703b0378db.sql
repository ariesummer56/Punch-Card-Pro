-- 1. Function: assign a single user to all non-archived jobs in their company
CREATE OR REPLACE FUNCTION public.assign_user_to_all_company_jobs(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  _company_id uuid;
  _role public.app_role;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT company_id INTO _company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

  IF _company_id IS NULL OR _role IS NULL THEN
    RETURN;
  END IF;

  IF _role NOT IN ('admin'::public.app_role, 'manager'::public.app_role, 'employee'::public.app_role) THEN
    RETURN;
  END IF;

  INSERT INTO public.employee_job_assignments (employee_user_id, job_id)
  SELECT _user_id, j.id
  FROM public.jobs j
  WHERE j.company_id = _company_id
    AND j.archived_at IS NULL
  ON CONFLICT (employee_user_id, job_id) DO NOTHING;
END;
$$;

-- 2. Trigger function for user_roles changes
CREATE OR REPLACE FUNCTION public.assign_user_jobs_on_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  PERFORM public.assign_user_to_all_company_jobs(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_user_jobs_on_role_change_trigger ON public.user_roles;
CREATE TRIGGER assign_user_jobs_on_role_change_trigger
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.assign_user_jobs_on_role_change();

-- 3. Trigger function for profiles.company_id changes
CREATE OR REPLACE FUNCTION public.assign_user_jobs_on_company_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL
    AND (TG_OP = 'INSERT' OR OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    PERFORM public.assign_user_to_all_company_jobs(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_user_jobs_on_company_change_trigger ON public.profiles;
CREATE TRIGGER assign_user_jobs_on_company_change_trigger
AFTER INSERT OR UPDATE OF company_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_user_jobs_on_company_change();

-- 4. One-time back-fill: every admin/manager/employee → every non-archived job in their company
INSERT INTO public.employee_job_assignments (employee_user_id, job_id)
SELECT p.user_id, j.id
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
JOIN public.jobs j ON j.company_id = p.company_id
WHERE p.company_id IS NOT NULL
  AND j.archived_at IS NULL
  AND ur.role IN ('admin'::public.app_role, 'manager'::public.app_role, 'employee'::public.app_role)
ON CONFLICT (employee_user_id, job_id) DO NOTHING;