ALTER TABLE public.company_payroll_email_settings
ADD COLUMN IF NOT EXISTS include_all_employees BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS selected_employee_user_ids UUID[] NOT NULL DEFAULT '{}';
