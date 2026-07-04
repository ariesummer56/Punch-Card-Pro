
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS override_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS override_admin_user_id uuid,
  ADD COLUMN IF NOT EXISTS adjusted_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adjusted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS adjusted_admin_user_id uuid,
  ADD COLUMN IF NOT EXISTS admin_adjustment_note text;

DROP POLICY IF EXISTS "Admins can create time entries for any employee" ON public.time_entries;

CREATE POLICY "Admins can create time entries for any employee"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
