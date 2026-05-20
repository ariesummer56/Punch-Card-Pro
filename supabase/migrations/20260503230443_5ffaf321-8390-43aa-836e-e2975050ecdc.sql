-- Dedupe existing same-day same-job clock-ins, keeping the earliest entry per (employee, job, date)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY employee_user_id, job_id, work_date
           ORDER BY clock_in_at ASC, created_at ASC, id ASC
         ) AS rn
  FROM public.time_entries
  WHERE clock_in_at IS NOT NULL
)
DELETE FROM public.time_entries t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

-- Enforce: at most one clock-in per (employee, job, work_date)
CREATE UNIQUE INDEX IF NOT EXISTS one_clock_in_per_employee_job_per_day
  ON public.time_entries (employee_user_id, job_id, work_date)
  WHERE clock_in_at IS NOT NULL;