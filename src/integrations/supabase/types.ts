export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_report_send_log: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          recipient_email: string
          sent_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          recipient_email: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          admin_alert_email: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          owner_admin_user_id: string
          updated_at: string
        }
        Insert: {
          admin_alert_email?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          owner_admin_user_id: string
          updated_at?: string
        }
        Update: {
          admin_alert_email?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_admin_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_activity_report_settings: {
        Row: {
          company_id: string
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_period_end: string | null
          recipients: string[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_period_end?: string | null
          recipients?: string[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_period_end?: string | null
          recipients?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      company_payroll_email_settings: {
        Row: {
          admin_user_id: string
          company_id: string
          created_at: string
          frequency: string
          id: string
          include_employee_names: boolean
          include_holiday_pay: boolean
          include_hours_worked: boolean
          include_jobs_assigned: boolean
          include_pto_used: boolean
          include_work_locations: boolean
          is_active: boolean
          last_sent_period_end: string | null
          last_sent_period_start: string | null
          recipient_email: string
          updated_at: string
          week_end_day: number
          week_start_day: number
        }
        Insert: {
          admin_user_id: string
          company_id: string
          created_at?: string
          frequency?: string
          id?: string
          include_employee_names?: boolean
          include_holiday_pay?: boolean
          include_hours_worked?: boolean
          include_jobs_assigned?: boolean
          include_pto_used?: boolean
          include_work_locations?: boolean
          is_active?: boolean
          last_sent_period_end?: string | null
          last_sent_period_start?: string | null
          recipient_email: string
          updated_at?: string
          week_end_day?: number
          week_start_day?: number
        }
        Update: {
          admin_user_id?: string
          company_id?: string
          created_at?: string
          frequency?: string
          id?: string
          include_employee_names?: boolean
          include_holiday_pay?: boolean
          include_hours_worked?: boolean
          include_jobs_assigned?: boolean
          include_pto_used?: boolean
          include_work_locations?: boolean
          is_active?: boolean
          last_sent_period_end?: string | null
          last_sent_period_start?: string | null
          recipient_email?: string
          updated_at?: string
          week_end_day?: number
          week_start_day?: number
        }
        Relationships: []
      }
      company_weekly_report_settings: {
        Row: {
          admin_user_id: string
          company_id: string | null
          created_at: string
          id: string
          include_contact_info: boolean
          include_emergency_contact: boolean
          include_payroll_email: boolean
          include_pto_balances: boolean
          include_threshold_status: boolean
          include_time_off_requests: boolean
          include_time_totals: boolean
          include_work_locations: boolean
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          include_contact_info?: boolean
          include_emergency_contact?: boolean
          include_payroll_email?: boolean
          include_pto_balances?: boolean
          include_threshold_status?: boolean
          include_time_off_requests?: boolean
          include_time_totals?: boolean
          include_work_locations?: boolean
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          include_contact_info?: boolean
          include_emergency_contact?: boolean
          include_payroll_email?: boolean
          include_pto_balances?: boolean
          include_threshold_status?: boolean
          include_time_off_requests?: boolean
          include_time_totals?: boolean
          include_work_locations?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_holiday_pay: {
        Row: {
          created_at: string
          employee_user_id: string
          holiday_date: string
          holiday_hours: number
          holiday_name: string
          id: string
          qualifies: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          worked_day_after: boolean
          worked_day_before: boolean
        }
        Insert: {
          created_at?: string
          employee_user_id: string
          holiday_date: string
          holiday_hours?: number
          holiday_name: string
          id?: string
          qualifies?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          worked_day_after?: boolean
          worked_day_before?: boolean
        }
        Update: {
          created_at?: string
          employee_user_id?: string
          holiday_date?: string
          holiday_hours?: number
          holiday_name?: string
          id?: string
          qualifies?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          worked_day_after?: boolean
          worked_day_before?: boolean
        }
        Relationships: []
      }
      employee_job_assignments: {
        Row: {
          assignment_note: string | null
          created_at: string
          employee_user_id: string
          id: string
          job_id: string
        }
        Insert: {
          assignment_note?: string | null
          created_at?: string
          employee_user_id: string
          id?: string
          job_id: string
        }
        Update: {
          assignment_note?: string | null
          created_at?: string
          employee_user_id?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pto_balances: {
        Row: {
          created_at: string
          day_off_enabled: boolean
          day_off_hours: number
          employee_user_id: string
          holiday_enabled: boolean
          holiday_hours: number
          id: string
          pto_accrual_enabled: boolean
          pto_accrual_rate_hours_per_paycheck: number
          pto_accrual_start_date: string | null
          pto_last_accrual_date: string | null
          pto_pay_periods_per_year: number
          sick_enabled: boolean
          sick_hours: number
          updated_at: string
          vacation_enabled: boolean
          vacation_hours: number
        }
        Insert: {
          created_at?: string
          day_off_enabled?: boolean
          day_off_hours?: number
          employee_user_id: string
          holiday_enabled?: boolean
          holiday_hours?: number
          id?: string
          pto_accrual_enabled?: boolean
          pto_accrual_rate_hours_per_paycheck?: number
          pto_accrual_start_date?: string | null
          pto_last_accrual_date?: string | null
          pto_pay_periods_per_year?: number
          sick_enabled?: boolean
          sick_hours?: number
          updated_at?: string
          vacation_enabled?: boolean
          vacation_hours?: number
        }
        Update: {
          created_at?: string
          day_off_enabled?: boolean
          day_off_hours?: number
          employee_user_id?: string
          holiday_enabled?: boolean
          holiday_hours?: number
          id?: string
          pto_accrual_enabled?: boolean
          pto_accrual_rate_hours_per_paycheck?: number
          pto_accrual_start_date?: string | null
          pto_last_accrual_date?: string | null
          pto_pay_periods_per_year?: number
          sick_enabled?: boolean
          sick_hours?: number
          updated_at?: string
          vacation_enabled?: boolean
          vacation_hours?: number
        }
        Relationships: []
      }
      employee_weekly_report_overrides: {
        Row: {
          created_at: string
          employee_user_id: string
          id: string
          include_contact_info: boolean | null
          include_emergency_contact: boolean | null
          include_payroll_email: boolean | null
          include_pto_balances: boolean | null
          include_threshold_status: boolean | null
          include_time_off_requests: boolean | null
          include_time_totals: boolean | null
          include_work_locations: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_user_id: string
          id?: string
          include_contact_info?: boolean | null
          include_emergency_contact?: boolean | null
          include_payroll_email?: boolean | null
          include_pto_balances?: boolean | null
          include_threshold_status?: boolean | null
          include_time_off_requests?: boolean | null
          include_time_totals?: boolean | null
          include_work_locations?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_user_id?: string
          id?: string
          include_contact_info?: boolean | null
          include_emergency_contact?: boolean | null
          include_payroll_email?: boolean | null
          include_pto_balances?: boolean | null
          include_threshold_status?: boolean | null
          include_time_off_requests?: boolean | null
          include_time_totals?: boolean | null
          include_work_locations?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      job_schedules: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          duration_days: number
          id: string
          job_id: string
          note: string | null
          scheduled_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          job_id: string
          note?: string | null
          scheduled_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          job_id?: string
          note?: string | null
          scheduled_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          address: string
          archived_at: string | null
          archived_by: string | null
          city: string
          company_id: string | null
          country: string
          created_at: string
          estimated_duration: string | null
          id: string
          job_description: string
          job_name: string
          late_grace_minutes: number
          latitude: number | null
          longitude: number | null
          manager_notes: string | null
          scheduled_start_date: string | null
          scheduled_start_time: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address: string
          archived_at?: string | null
          archived_by?: string | null
          city: string
          company_id?: string | null
          country?: string
          created_at?: string
          estimated_duration?: string | null
          id?: string
          job_description: string
          job_name: string
          late_grace_minutes?: number
          latitude?: number | null
          longitude?: number | null
          manager_notes?: string | null
          scheduled_start_date?: string | null
          scheduled_start_time?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          address?: string
          archived_at?: string | null
          archived_by?: string | null
          city?: string
          company_id?: string | null
          country?: string
          created_at?: string
          estimated_duration?: string | null
          id?: string
          job_description?: string
          job_name?: string
          late_grace_minutes?: number
          latitude?: number | null
          longitude?: number | null
          manager_notes?: string | null
          scheduled_start_date?: string | null
          scheduled_start_time?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_automation_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      payroll_email_send_log: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          frequency: string
          id: string
          period_end: string
          period_start: string
          recipient_email: string
          row_count: number
          sent_at: string | null
          settings_id: string
          status: string
          total_hours: number
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          frequency: string
          id?: string
          period_end: string
          period_start: string
          recipient_email: string
          row_count?: number
          sent_at?: string | null
          settings_id: string
          status?: string
          total_hours?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          frequency?: string
          id?: string
          period_end?: string
          period_start?: string
          recipient_email?: string
          row_count?: number
          sent_at?: string | null
          settings_id?: string
          status?: string
          total_hours?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_alert_email: string | null
          company_id: string | null
          company_name: string | null
          company_role: string | null
          created_at: string
          display_name: string | null
          email: string | null
          emergency_contact: string | null
          employee_pin: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          payroll_email: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_alert_email?: string | null
          company_id?: string | null
          company_name?: string | null
          company_role?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_pin?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          payroll_email?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_alert_email?: string | null
          company_id?: string | null
          company_name?: string | null
          company_role?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_pin?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          payroll_email?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          adjusted_admin_user_id: string | null
          adjusted_at: string | null
          adjusted_by_admin: boolean
          admin_adjustment_note: string | null
          break_minutes: number
          client_sync_id: string | null
          clock_in_accuracy_meters: number | null
          clock_in_at: string | null
          clock_in_distance_meters: number | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_out_accuracy_meters: number | null
          clock_out_at: string | null
          clock_out_distance_meters: number | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          created_at: string
          employee_user_id: string
          id: string
          is_late: boolean
          is_saved: boolean
          is_shift_end: boolean
          job_id: string | null
          late_minutes: number
          override_admin_user_id: string | null
          override_by_admin: boolean
          override_reason: string | null
          paid_start_at: string | null
          threshold_alert_sent_at: string | null
          total_minutes: number
          updated_at: string
          weekly_report_sent_at: string | null
          work_date: string
        }
        Insert: {
          adjusted_admin_user_id?: string | null
          adjusted_at?: string | null
          adjusted_by_admin?: boolean
          admin_adjustment_note?: string | null
          break_minutes?: number
          client_sync_id?: string | null
          clock_in_accuracy_meters?: number | null
          clock_in_at?: string | null
          clock_in_distance_meters?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_accuracy_meters?: number | null
          clock_out_at?: string | null
          clock_out_distance_meters?: number | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          employee_user_id: string
          id?: string
          is_late?: boolean
          is_saved?: boolean
          is_shift_end?: boolean
          job_id?: string | null
          late_minutes?: number
          override_admin_user_id?: string | null
          override_by_admin?: boolean
          override_reason?: string | null
          paid_start_at?: string | null
          threshold_alert_sent_at?: string | null
          total_minutes?: number
          updated_at?: string
          weekly_report_sent_at?: string | null
          work_date?: string
        }
        Update: {
          adjusted_admin_user_id?: string | null
          adjusted_at?: string | null
          adjusted_by_admin?: boolean
          admin_adjustment_note?: string | null
          break_minutes?: number
          client_sync_id?: string | null
          clock_in_accuracy_meters?: number | null
          clock_in_at?: string | null
          clock_in_distance_meters?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_accuracy_meters?: number | null
          clock_out_at?: string | null
          clock_out_distance_meters?: number | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          employee_user_id?: string
          id?: string
          is_late?: boolean
          is_saved?: boolean
          is_shift_end?: boolean
          job_id?: string | null
          late_minutes?: number
          override_admin_user_id?: string | null
          override_by_admin?: boolean
          override_reason?: string | null
          paid_start_at?: string | null
          threshold_alert_sent_at?: string | null
          total_minutes?: number
          updated_at?: string
          weekly_report_sent_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_deletion_log: {
        Row: {
          break_minutes: number | null
          clock_in_at: string | null
          clock_out_at: string | null
          company_id: string
          deleted_at: string
          deleted_by_email: string | null
          deleted_by_name: string | null
          deleted_by_user_id: string
          deletion_reason: string | null
          employee_user_id: string
          id: string
          job_id: string | null
          time_entry_id: string
          total_minutes: number | null
          work_date: string
        }
        Insert: {
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          company_id: string
          deleted_at?: string
          deleted_by_email?: string | null
          deleted_by_name?: string | null
          deleted_by_user_id: string
          deletion_reason?: string | null
          employee_user_id: string
          id?: string
          job_id?: string | null
          time_entry_id: string
          total_minutes?: number | null
          work_date: string
        }
        Update: {
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          company_id?: string
          deleted_at?: string
          deleted_by_email?: string | null
          deleted_by_name?: string | null
          deleted_by_user_id?: string
          deletion_reason?: string | null
          employee_user_id?: string
          id?: string
          job_id?: string | null
          time_entry_id?: string
          total_minutes?: number | null
          work_date?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          admin_response_note: string | null
          company_id: string | null
          created_at: string
          employee_user_id: string
          end_date: string
          id: string
          note: string | null
          reminder_email_sent_at: string | null
          request_type: Database["public"]["Enums"]["pto_request_type"]
          requested_hours: number
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["pto_request_status"]
          updated_at: string
        }
        Insert: {
          admin_response_note?: string | null
          company_id?: string | null
          created_at?: string
          employee_user_id: string
          end_date: string
          id?: string
          note?: string | null
          reminder_email_sent_at?: string | null
          request_type: Database["public"]["Enums"]["pto_request_type"]
          requested_hours: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["pto_request_status"]
          updated_at?: string
        }
        Update: {
          admin_response_note?: string | null
          company_id?: string | null
          created_at?: string
          employee_user_id?: string
          end_date?: string
          id?: string
          note?: string | null
          reminder_email_sent_at?: string | null
          request_type?: Database["public"]["Enums"]["pto_request_type"]
          requested_hours?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["pto_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_inactive_jobs: { Args: never; Returns: number }
      assign_user_to_all_company_jobs: {
        Args: { _user_id: string }
        Returns: undefined
      }
      complete_admin_onboarding: {
        Args: {
          _admin_alert_email?: string
          _company_name: string
          _contact_email?: string
          _display_name?: string
          _phone?: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      employee_weekly_minutes: {
        Args: { _employee_user_id: string; _work_date: string }
        Returns: number
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      job_last_activity_at: { Args: { _job_id: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      pto_accrual_rate_hours_per_paycheck_for_hire_date: {
        Args: {
          _as_of?: string
          _hire_date: string
          _pay_periods_per_year?: number
        }
        Returns: number
      }
      pto_accrued_hours_for_hire_date: {
        Args: {
          _as_of?: string
          _hire_date: string
          _pay_periods_per_year?: number
        }
        Returns: number
      }
      pto_annual_hours_for_hire_date: {
        Args: { _as_of?: string; _hire_date: string }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_roles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_company_id: { Args: { _user_id: string }; Returns: string }
      week_start_for: { Args: { _date: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "employee" | "manager"
      pto_request_status: "pending" | "approved" | "denied" | "cancelled"
      pto_request_type: "vacation" | "sick" | "holiday" | "day_off"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee", "manager"],
      pto_request_status: ["pending", "approved", "denied", "cancelled"],
      pto_request_type: ["vacation", "sick", "holiday", "day_off"],
    },
  },
} as const
