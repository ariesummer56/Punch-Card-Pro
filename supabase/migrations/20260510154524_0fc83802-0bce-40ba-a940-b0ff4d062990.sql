ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scheduled_start_date date,
  ADD COLUMN IF NOT EXISTS estimated_duration text;