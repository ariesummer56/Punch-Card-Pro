import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'

type PayrollFrequency = 'weekly' | 'biweekly'

type PayrollSettings = {
  id: string
  company_id: string
  recipient_email: string
  frequency: PayrollFrequency
  week_start_day: number
  week_end_day: number
  include_employee_names: boolean
  include_hours_worked: boolean
  include_jobs_assigned: boolean
  include_pto_used: boolean
  include_holiday_pay: boolean
  include_work_locations: boolean
  include_all_employees: boolean
  selected_employee_user_ids: string[] | null
  is_active: boolean
}

const addDaysIso = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const formatDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

const periodStartFor = (dateIso: string, startDay: number, frequency: PayrollFrequency) => {
  const date = new Date(`${dateIso}T00:00:00Z`)
  const offset = (date.getUTCDay() - startDay + 7) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  if (frequency === 'biweekly') {
    const anchor = new Date('2024-01-01T00:00:00Z')
    const daysSinceAnchor = Math.floor((date.getTime() - anchor.getTime()) / 86400000)
    const weeksSinceAnchor = Math.floor(daysSinceAnchor / 7)
    if (Math.abs(weeksSinceAnchor) % 2 === 1) date.setUTCDate(date.getUTCDate() - 7)
  }
  return date.toISOString().slice(0, 10)
}

const completedPeriodFor = (settings: PayrollSettings, baseDate = todayIso()) => {
  const currentStart = periodStartFor(baseDate, settings.week_start_day, settings.frequency)
  const length = settings.frequency === 'biweekly' ? 14 : 7
  const start = addDaysIso(currentStart, -length)
  const end = addDaysIso(currentStart, -1)
  return { start, end, label: `${formatDate(start)} – ${formatDate(end)}` }
}

const dateRangesOverlap = (startA: string, endA: string, startB: string, endB: string) => startA <= endB && endA >= startB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration is missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const authHeader = req.headers.get('Authorization')
  const automationToken = req.headers.get('x-payroll-automation-token')
  const { data: tokenRow } = await createClient(supabaseUrl, serviceRoleKey)
    .from('payroll_automation_tokens')
    .select('token')
    .limit(1)
    .maybeSingle()
  if (authHeader !== `Bearer ${serviceRoleKey}` && (!tokenRow?.token || automationToken !== tokenRow.token)) {
    return new Response(JSON.stringify({ error: 'Automation access required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: settingsRows, error: settingsError } = await adminClient
    .from('company_payroll_email_settings')
    .select('*')
    .eq('is_active', true)

  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const results = []
  for (const settings of (settingsRows ?? []) as PayrollSettings[]) {
    // Resolve recipient from company owner admin profile (single source of truth)
    const { data: ownerCompany } = await adminClient
      .from('companies')
      .select('owner_admin_user_id, admin_alert_email')
      .eq('id', settings.company_id)
      .maybeSingle()
    let recipientEmail = settings.recipient_email
    if (ownerCompany?.owner_admin_user_id) {
      const { data: ownerProfile } = await adminClient
        .from('profiles')
        .select('admin_alert_email, email')
        .eq('user_id', ownerCompany.owner_admin_user_id)
        .maybeSingle()
      recipientEmail = ownerProfile?.admin_alert_email
        || ownerCompany.admin_alert_email
        || ownerProfile?.email
        || settings.recipient_email
    }
    settings.recipient_email = recipientEmail
    const period = completedPeriodFor(settings)
    const { data: existingLog } = await adminClient
      .from('payroll_email_send_log')
      .select('id, status')
      .eq('settings_id', settings.id)
      .eq('period_start', period.start)
      .eq('period_end', period.end)
      .maybeSingle()

    if (existingLog?.status === 'sent' || existingLog?.status === 'pending') {
      results.push({ settingsId: settings.id, status: 'skipped', reason: 'already queued or sent' })
      continue
    }

    const selectedEmployeeIds = new Set(settings.selected_employee_user_ids ?? [])
    const includeEmployee = (employeeId: string) => settings.include_all_employees || selectedEmployeeIds.has(employeeId)

    const [{ data: company }, { data: profiles }, { data: jobs }, { data: assignments }, { data: entries }, { data: requests }, { data: holidays }] = await Promise.all([
      adminClient.from('companies').select('name').eq('id', settings.company_id).maybeSingle(),
      adminClient.from('profiles').select('user_id, display_name, email').eq('company_id', settings.company_id),
      adminClient.from('jobs').select('id, job_name, address, city, state').eq('company_id', settings.company_id),
      adminClient.from('employee_job_assignments').select('employee_user_id, job_id'),
      adminClient.from('time_entries').select('employee_user_id, job_id, work_date, total_minutes, clock_in_latitude, clock_in_longitude, clock_out_latitude, clock_out_longitude').gte('work_date', period.start).lte('work_date', period.end),
      adminClient.from('time_off_requests').select('employee_user_id, request_type, start_date, end_date, requested_hours, status').eq('status', 'approved'),
      adminClient.from('employee_holiday_pay').select('employee_user_id, holiday_date, holiday_hours, qualifies').eq('qualifies', true).gte('holiday_date', period.start).lte('holiday_date', period.end),
    ])

    const employeeName = (employeeId: string) => profiles?.find((profile) => profile.user_id === employeeId)?.display_name || profiles?.find((profile) => profile.user_id === employeeId)?.email || 'Employee'
    const jobLabel = (jobId?: string | null) => {
      const job = jobs?.find((item) => item.id === jobId)
      return job ? `${job.job_name} — ${job.address}` : 'Unassigned job'
    }
    const assignedJobsFor = (employeeId: string) => (assignments ?? [])
      .filter((assignment) => assignment.employee_user_id === employeeId)
      .map((assignment) => jobs?.find((job) => job.id === assignment.job_id))
      .filter(Boolean)
      .map((job) => `${job!.job_name} — ${job!.address}`)
      .join('; ') || 'No assigned jobs'

    const filteredEntries = (entries ?? []).filter((entry) => includeEmployee(entry.employee_user_id))
    const filteredRequests = (requests ?? []).filter((request) => includeEmployee(request.employee_user_id))
    const filteredHolidays = (holidays ?? []).filter((holiday) => includeEmployee(holiday.employee_user_id))
    const keys = Array.from(new Set(filteredEntries.map((entry) => `${entry.employee_user_id}:${entry.job_id ?? 'unassigned'}`)))
    const firstKeyByEmployee = new Map<string, string>()
    keys.forEach((key) => {
      const [employeeId] = key.split(':')
      if (!firstKeyByEmployee.has(employeeId)) firstKeyByEmployee.set(employeeId, key)
    })
    const rows = keys.map((key) => {
      const [employeeId, jobKey] = key.split(':')
      const jobId = jobKey === 'unassigned' ? null : jobKey
      const rowEntries = filteredEntries.filter((entry) => entry.employee_user_id === employeeId && (entry.job_id ?? null) === jobId)
      const includeEmployeePeriodTotals = firstKeyByEmployee.get(employeeId) === key
      const ptoUsed = includeEmployeePeriodTotals ? filteredRequests
        .filter((request) => request.employee_user_id === employeeId && request.request_type !== 'holiday' && dateRangesOverlap(request.start_date, request.end_date, period.start, period.end))
        .reduce((sum, request) => sum + Number(request.requested_hours || 0), 0) : 0
      const holidayPay = includeEmployeePeriodTotals ? filteredHolidays
        .filter((holiday) => holiday.employee_user_id === employeeId)
        .reduce((sum, holiday) => sum + Number(holiday.holiday_hours || 0), 0) : 0
      const workLocations = rowEntries.map((entry) => {
        const clockIn = entry.clock_in_latitude && entry.clock_in_longitude ? `in ${Number(entry.clock_in_latitude).toFixed(5)}, ${Number(entry.clock_in_longitude).toFixed(5)}` : 'clock-in GPS not captured'
        const clockOut = entry.clock_out_latitude && entry.clock_out_longitude ? `out ${Number(entry.clock_out_latitude).toFixed(5)}, ${Number(entry.clock_out_longitude).toFixed(5)}` : 'clock-out GPS not captured'
        return `${entry.work_date}: ${clockIn}; ${clockOut}`
      }).join(' | ')
      return {
        employeeName: employeeName(employeeId),
        jobSite: jobLabel(jobId),
        assignedJobs: assignedJobsFor(employeeId),
        hoursWorked: (rowEntries.reduce((sum, entry) => sum + Number(entry.total_minutes || 0), 0) / 60).toFixed(2),
        ptoUsed: ptoUsed.toFixed(2),
        holidayPay: holidayPay.toFixed(2),
        workLocations,
      }
    })

    const totalHours = rows.reduce((sum, row) => sum + Number(row.hoursWorked), 0)
    const { data: log } = await adminClient.from('payroll_email_send_log').upsert({
      company_id: settings.company_id,
      settings_id: settings.id,
      period_start: period.start,
      period_end: period.end,
      frequency: settings.frequency,
      recipient_email: settings.recipient_email,
      status: 'pending',
      row_count: rows.length,
      total_hours: totalHours,
    }, { onConflict: 'settings_id,period_start,period_end' }).select('id').single()

    const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateName: 'payroll-report-export',
        recipientEmail: settings.recipient_email,
        idempotencyKey: `payroll-report-${settings.company_id}-${period.start}-${period.end}`,
        templateData: {
          companyName: company?.name ?? 'Punch Card Pro',
          periodLabel: period.label,
          frequency: settings.frequency,
          includedFields: [
            settings.include_employee_names && 'Employee names',
            settings.include_hours_worked && 'Hours worked',
            settings.include_jobs_assigned && 'Jobs assigned',
            settings.include_pto_used && 'PTO used',
            settings.include_holiday_pay && 'Holiday pay',
            settings.include_work_locations && 'Work locations',
          ].filter(Boolean),
          employeeSelection: settings.include_all_employees ? 'All employees' : `${selectedEmployeeIds.size} selected employees`,
          totals: { hoursWorked: totalHours.toFixed(2), rows: rows.length },
          rows,
        },
      }),
    })

    if (!response.ok) {
      await adminClient.from('payroll_email_send_log').update({ status: 'failed', error_message: await response.text() }).eq('id', log?.id)
      results.push({ settingsId: settings.id, status: 'failed' })
      continue
    }

    await Promise.all([
      adminClient.from('payroll_email_send_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', log?.id),
      adminClient.from('company_payroll_email_settings').update({ last_sent_period_start: period.start, last_sent_period_end: period.end }).eq('id', settings.id),
    ])
    results.push({ settingsId: settings.id, status: 'sent', rows: rows.length })
  }

  return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
