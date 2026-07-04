-- Add a column to mark a time entry as the master end-of-day logout
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS is_shift_end boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_workdate_shift_end
  ON public.time_entries (employee_user_id, work_date)
  WHERE is_shift_end = true;

-- Prevent clocking in again on a day that's already been locked by a master logout
CREATE OR REPLACE FUNCTION public.prevent_clock_in_after_shift_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.clock_in_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.clock_in_at IS NOT NULL
    AND OLD.work_date = NEW.work_date
    AND OLD.employee_user_id = NEW.employee_user_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE employee_user_id = NEW.employee_user_id
      AND work_date = NEW.work_date
      AND is_shift_end = true
      AND id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Shift already ended for the day. New clock-ins are locked until the next day.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_clock_in_after_shift_end_trg ON public.time_entries;
CREATE TRIGGER prevent_clock_in_after_shift_end_trg
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_clock_in_after_shift_end();