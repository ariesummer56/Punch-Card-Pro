ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS client_sync_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_employee_client_sync_id
ON public.time_entries(employee_user_id, client_sync_id)
WHERE client_sync_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_active_status
ON public.time_entries(employee_user_id, clock_in_at, clock_out_at, work_date);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;