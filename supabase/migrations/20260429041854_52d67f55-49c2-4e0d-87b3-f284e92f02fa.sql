DROP INDEX IF EXISTS public.idx_time_entries_employee_client_sync_id;

ALTER TABLE public.time_entries
DROP CONSTRAINT IF EXISTS time_entries_employee_client_sync_id_key;

ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_employee_client_sync_id_key UNIQUE (employee_user_id, client_sync_id);