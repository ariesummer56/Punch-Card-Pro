CREATE OR REPLACE FUNCTION public.assign_new_job_to_company_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.employee_job_assignments (employee_user_id, job_id)
  SELECT p.user_id, NEW.id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.company_id = NEW.company_id
    AND ur.role IN ('admin'::public.app_role, 'manager'::public.app_role, 'employee'::public.app_role)
  ON CONFLICT (employee_user_id, job_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_new_job_to_company_users_trigger ON public.jobs;
CREATE TRIGGER assign_new_job_to_company_users_trigger
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.assign_new_job_to_company_users();

CREATE OR REPLACE FUNCTION public.validate_time_entry_job_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.job_id IS NULL OR NEW.clock_in_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.clock_in_at IS NOT NULL
    AND OLD.job_id IS NOT DISTINCT FROM NEW.job_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employee_job_assignments a
    WHERE a.employee_user_id = NEW.employee_user_id
      AND a.job_id = NEW.job_id
  ) THEN
    RAISE EXCEPTION 'Employee is not assigned to this job';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_time_entry_job_assignment_trigger ON public.time_entries;
CREATE TRIGGER validate_time_entry_job_assignment_trigger
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.validate_time_entry_job_assignment();