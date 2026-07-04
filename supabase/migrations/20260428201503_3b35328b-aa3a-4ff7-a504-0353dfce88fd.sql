ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS clock_in_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS clock_in_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS clock_in_accuracy_meters DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS clock_in_distance_meters DOUBLE PRECISION;

CREATE POLICY "Managers can view jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update job GPS pins"
ON public.jobs
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'manager'::app_role));