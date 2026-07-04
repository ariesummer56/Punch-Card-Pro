-- Attach existing calculate_time_entry_total function as a BEFORE INSERT/UPDATE trigger
-- so total_minutes always reflects clock_in_at, clock_out_at, and break_minutes.
DROP TRIGGER IF EXISTS time_entries_calculate_total ON public.time_entries;
CREATE TRIGGER time_entries_calculate_total
BEFORE INSERT OR UPDATE OF clock_in_at, clock_out_at, break_minutes
ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.calculate_time_entry_total();

-- Backfill any closed shifts where total_minutes is still 0
UPDATE public.time_entries
SET total_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (clock_out_at - clock_in_at))/60)::int - COALESCE(break_minutes, 0))
WHERE clock_out_at IS NOT NULL
  AND clock_in_at IS NOT NULL
  AND total_minutes = 0;