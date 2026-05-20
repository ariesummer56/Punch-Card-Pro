ALTER TABLE public.employee_job_assignments
  ADD COLUMN IF NOT EXISTS assignment_note TEXT;

CREATE OR REPLACE FUNCTION public.validate_employee_assignment_note()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF char_length(COALESCE(NEW.assignment_note, '')) > 1000 THEN
    RAISE EXCEPTION 'Assignment note must be 1000 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_employee_assignment_note_trigger ON public.employee_job_assignments;
CREATE TRIGGER validate_employee_assignment_note_trigger
BEFORE INSERT OR UPDATE ON public.employee_job_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_employee_assignment_note();
