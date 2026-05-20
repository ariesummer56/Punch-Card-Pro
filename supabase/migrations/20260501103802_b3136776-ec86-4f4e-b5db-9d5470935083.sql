-- Update auto-assign trigger to skip employees (only admins/managers get auto-assigned to new jobs)
CREATE OR REPLACE FUNCTION public.assign_new_job_to_company_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.employee_job_assignments (employee_user_id, job_id)
  SELECT p.user_id, NEW.id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.company_id = NEW.company_id
    AND ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  ON CONFLICT (employee_user_id, job_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_new_job_to_company_users() FROM PUBLIC, anon, authenticated;

-- Helper function: only auto-assign admins/managers across all jobs; employees are opt-in
CREATE OR REPLACE FUNCTION public.assign_user_to_all_company_jobs(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
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

  -- Employees must be selected manually; only auto-assign admins and managers
  IF _role NOT IN ('admin'::public.app_role, 'manager'::public.app_role) THEN
    RETURN;
  END IF;

  INSERT INTO public.employee_job_assignments (employee_user_id, job_id)
  SELECT _user_id, j.id
  FROM public.jobs j
  WHERE j.company_id = _company_id
    AND j.archived_at IS NULL
  ON CONFLICT (employee_user_id, job_id) DO NOTHING;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assign_user_to_all_company_jobs(uuid) FROM PUBLIC, anon, authenticated;

-- Backfill: ensure every existing admin/manager is assigned to every existing non-archived job in their company
INSERT INTO public.employee_job_assignments (employee_user_id, job_id)
SELECT p.user_id, j.id
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
JOIN public.jobs j ON j.company_id = p.company_id AND j.archived_at IS NULL
WHERE ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)
ON CONFLICT (employee_user_id, job_id) DO NOTHING;