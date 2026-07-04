CREATE OR REPLACE FUNCTION public.prevent_clock_in_after_shift_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.prevent_clock_in_after_shift_end() FROM PUBLIC, anon, authenticated;