CREATE POLICY "No user access to payroll automation tokens"
ON public.payroll_automation_tokens
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);