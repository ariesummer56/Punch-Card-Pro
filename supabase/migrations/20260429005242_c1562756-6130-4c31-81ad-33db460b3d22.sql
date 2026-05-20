CREATE TABLE public.payroll_automation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_automation_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.payroll_automation_tokens DEFAULT VALUES;