CREATE UNIQUE INDEX IF NOT EXISTS one_active_time_entry_per_employee
ON public.time_entries (employee_user_id)
WHERE clock_in_at IS NOT NULL AND clock_out_at IS NULL;