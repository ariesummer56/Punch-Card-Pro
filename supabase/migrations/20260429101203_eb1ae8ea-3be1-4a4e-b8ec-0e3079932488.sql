ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID;

CREATE INDEX IF NOT EXISTS idx_jobs_archived_at ON public.jobs (archived_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_activity ON public.time_entries (job_id, clock_in_at, clock_out_at, updated_at);

CREATE OR REPLACE FUNCTION public.job_last_activity_at(_job_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((SELECT j.updated_at FROM public.jobs j WHERE j.id = _job_id), '-infinity'::timestamp with time zone),
    COALESCE((SELECT MAX(te.clock_in_at) FROM public.time_entries te WHERE te.job_id = _job_id), '-infinity'::timestamp with time zone),
    COALESCE((SELECT MAX(te.clock_out_at) FROM public.time_entries te WHERE te.job_id = _job_id), '-infinity'::timestamp with time zone),
    COALESCE((SELECT MAX(te.updated_at) FROM public.time_entries te WHERE te.job_id = _job_id), '-infinity'::timestamp with time zone)
  )
$$;

CREATE OR REPLACE FUNCTION public.archive_inactive_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _archived_count INTEGER := 0;
BEGIN
  WITH archived AS (
    UPDATE public.jobs j
    SET archived_at = now(),
        archived_by = NULL,
        updated_at = now()
    WHERE j.archived_at IS NULL
      AND public.job_last_activity_at(j.id) < (now() - INTERVAL '7 days')
    RETURNING j.id
  )
  SELECT COUNT(*) INTO _archived_count FROM archived;

  RETURN _archived_count;
END;
$$;

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

  IF EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = NEW.job_id
      AND j.archived_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Archived jobs must be unarchived before employees can clock in';
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

REVOKE ALL ON FUNCTION public.job_last_activity_at(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_last_activity_at(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.job_last_activity_at(UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.archive_inactive_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_inactive_jobs() FROM anon;
REVOKE ALL ON FUNCTION public.archive_inactive_jobs() FROM authenticated;

REVOKE ALL ON FUNCTION public.validate_time_entry_job_assignment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_time_entry_job_assignment() FROM anon;
REVOKE ALL ON FUNCTION public.validate_time_entry_job_assignment() FROM authenticated;