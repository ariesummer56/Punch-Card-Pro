-- Job schedule fields
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scheduled_start_time time,
  ADD COLUMN IF NOT EXISTS late_grace_minutes integer NOT NULL DEFAULT 0;

-- Time entry late/paid-start fields
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS paid_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_minutes integer NOT NULL DEFAULT 0;

-- Updated trigger function
CREATE OR REPLACE FUNCTION public.calculate_time_entry_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _sched_time time;
  _grace integer;
  _sched_at timestamptz;
  _tz text;
BEGIN
  -- Default: paid_start_at = clock_in_at
  IF NEW.clock_in_at IS NOT NULL THEN
    NEW.paid_start_at := NEW.clock_in_at;
  END IF;

  IF NEW.job_id IS NOT NULL AND NEW.clock_in_at IS NOT NULL THEN
    SELECT scheduled_start_time, COALESCE(late_grace_minutes, 0)
      INTO _sched_time, _grace
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF _sched_time IS NOT NULL THEN
      -- Build scheduled timestamp using the work_date in the clock_in timezone
      _tz := COALESCE(current_setting('TIMEZONE', true), 'UTC');
      _sched_at := ((NEW.work_date::text || ' ' || _sched_time::text))::timestamp AT TIME ZONE _tz;

      IF NEW.clock_in_at < _sched_at THEN
        NEW.paid_start_at := _sched_at;
        NEW.is_late := false;
        NEW.late_minutes := 0;
      ELSE
        NEW.paid_start_at := NEW.clock_in_at;
        IF NEW.clock_in_at > _sched_at + (_grace || ' minutes')::interval THEN
          NEW.is_late := true;
          NEW.late_minutes := FLOOR(EXTRACT(EPOCH FROM (NEW.clock_in_at - _sched_at)) / 60)::int;
        ELSE
          NEW.is_late := false;
          NEW.late_minutes := 0;
        END IF;
      END IF;
    ELSE
      NEW.is_late := false;
      NEW.late_minutes := 0;
    END IF;
  END IF;

  IF NEW.paid_start_at IS NOT NULL AND NEW.clock_out_at IS NOT NULL THEN
    NEW.total_minutes := GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.paid_start_at)) / 60)::int
        - COALESCE(NEW.break_minutes, 0)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS time_entries_calculate_total ON public.time_entries;
CREATE TRIGGER time_entries_calculate_total
  BEFORE INSERT OR UPDATE OF clock_in_at, clock_out_at, break_minutes, job_id, work_date
  ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_time_entry_total();

-- Backfill: re-trigger compute on rows with clock_in_at set
UPDATE public.time_entries
SET clock_in_at = clock_in_at
WHERE clock_in_at IS NOT NULL;