import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'

type Settings = {
  id: string
  company_id: string
  is_active: boolean
  frequency: 'weekly' | 'biweekly'
  recipients: string[]
  last_sent_period_end: string | null
}

const ET_OFFSET_HOURS = 5 // EST baseline; cron at 13:00 UTC = 08:00 EST / 09:00 EDT

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Return Monday (ISO date) of the week containing `iso`
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=Sun..6=Sat
  const delta = (dow + 6) % 7 // days since Monday
  d.setUTCDate(d.getUTCDate() - delta)
  return d.toISOString().slice(0, 10)
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

// Returns the period [start, end] (inclusive) covering the prior week (or 2 weeks) for given frequency.
function computePeriod(todayIso: string, frequency: 'weekly' | 'biweekly') {
  const thisMonday = mondayOf(todayIso)
  const end = addDays(thisMonday, -1)
  const length = frequency === 'biweekly' ? 14 : 7
  const start = addDays(end, -(length - 1))
  return { start, end, label: `${fmtDate(start)} – ${fmtDate(end)}` }
}

// For biweekly: only send on alternating Mondays (anchored on a fixed date)
function isBiweeklyDue(todayIso: string) {
  const anchor = new Date('2024-01-01T00:00:00Z') // Monday
  const today = new Date(`${mondayOf(todayIso)}T00:00:00Z`)
  const weeks = Math.floor((today.getTime() - anchor.getTime()) / (7 * 86400000))
  return weeks % 2 === 0
}

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

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Auth: service-role bearer, shared automation token, OR an authenticated company admin/manager
  const authHeader = req.headers.get('Authorization') ?? ''
  const automationToken = req.headers.get('x-payroll-automation-token')
  const { data: tokenRow } = await admin.from('payroll_automation_tokens').select('token').limit(1).maybeSingle()
  const serviceBearer = authHeader === `Bearer ${serviceRoleKey}`
  const tokenOk = !!tokenRow?.token && automationToken === tokenRow.token

  let adminUserOk = false
  if (!serviceBearer && !tokenOk && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)
    const { data: claimsData } = await admin.auth.getClaims(token)
    const uid = claimsData?.claims?.sub
    if (uid) {
      const { data: roleRow } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .in('role', ['admin', 'manager'])
        .maybeSingle()
      adminUserOk = !!roleRow
    }
  }

  if (!serviceBearer && !tokenOk && !adminUserOk) {
    return new Response(JSON.stringify({ error: 'Automation access required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Body params
  let body: any = {}
  try { body = await req.json() } catch { /* ignore */ }
  const force = body?.force === true
  const filterCompanyId: string | undefined = body?.companyId

  // Today in Eastern Time
  const nowEt = new Date(Date.now() - ET_OFFSET_HOURS * 3600 * 1000)
  const todayIso = nowEt.toISOString().slice(0, 10)

  let query = admin.from('company_activity_report_settings').select('*').eq('is_active', true)
  if (filterCompanyId) query = query.eq('company_id', filterCompanyId)

  const { data: rows, error: settingsErr } = await query
  if (settingsErr) {
    return new Response(JSON.stringify({ error: settingsErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const results: any[] = []

  for (const s of (rows ?? []) as Settings[]) {
    try {
      if (!force && s.frequency === 'biweekly' && !isBiweeklyDue(todayIso)) {
        results.push({ companyId: s.company_id, status: 'skipped', reason: 'biweekly off-cycle' })
        continue
      }

      const period = computePeriod(todayIso, s.frequency)

      if (!force && s.last_sent_period_end && s.last_sent_period_end >= period.end) {
        results.push({ companyId: s.company_id, status: 'skipped', reason: 'already sent' })
        continue
      }

      if (!s.recipients || s.recipients.length === 0) {
        results.push({ companyId: s.company_id, status: 'skipped', reason: 'no recipients' })
        continue
      }

      // Company
      const { data: company } = await admin
        .from('companies').select('name').eq('id', s.company_id).maybeSingle()
      const companyName = company?.name ?? 'Your company'

      // Active employees in this company (profile + any role)
      const { data: profiles } = await admin
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('company_id', s.company_id)
      const { data: roles } = await admin
        .from('user_roles')
        .select('user_id, role')
      const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]))
      const employees = (profiles ?? []).filter((p: any) => roleMap.has(p.user_id))
      const totalActiveEmployees = employees.length

      // Time entries in period
      const startTs = `${period.start}T00:00:00Z`
      const endTs = `${period.end}T23:59:59Z`
      const { data: entries } = await admin
        .from('time_entries')
        .select('employee_user_id, job_id, total_minutes, clock_in_at, work_date')
        .gte('work_date', period.start)
        .lte('work_date', period.end)
      const companyEmpIds = new Set(employees.map((e: any) => e.user_id))
      const periodEntries = (entries ?? []).filter((e: any) => companyEmpIds.has(e.employee_user_id))

      const totalMinutes = periodEntries.reduce((sum: number, e: any) => sum + (e.total_minutes || 0), 0)
      const totalHours = totalMinutes / 60

      const punchedIds = new Set(periodEntries.filter((e: any) => e.clock_in_at).map((e: any) => e.employee_user_id))
      const noPunchEmployees = employees
        .filter((e: any) => !punchedIds.has(e.user_id))
        .map((e: any) => ({ name: e.display_name || e.email || 'Unnamed', email: e.email || undefined }))

      // Job breakdown
      const jobIds = Array.from(new Set(periodEntries.map((e: any) => e.job_id).filter(Boolean)))
      const { data: jobs } = jobIds.length
        ? await admin.from('jobs').select('id, job_name').in('id', jobIds)
        : { data: [] as any[] }
      const jobNameMap = new Map((jobs ?? []).map((j: any) => [j.id, j.job_name]))
      const perJob = new Map<string, { minutes: number; emps: Set<string> }>()
      for (const e of periodEntries) {
        const key = e.job_id || '__unassigned__'
        if (!perJob.has(key)) perJob.set(key, { minutes: 0, emps: new Set() })
        const agg = perJob.get(key)!
        agg.minutes += e.total_minutes || 0
        agg.emps.add(e.employee_user_id)
      }
      const jobBreakdown = Array.from(perJob.entries())
        .map(([id, v]) => ({
          jobName: id === '__unassigned__' ? 'Unassigned' : (jobNameMap.get(id) || 'Unknown job'),
          hours: v.minutes / 60,
          employeeCount: v.emps.size,
        }))
        .sort((a, b) => b.hours - a.hours)

      const frequencyLabel = s.frequency === 'biweekly' ? 'Bi-weekly' : 'Weekly'

      // Send to each recipient
      const recipientResults: any[] = []
      for (const recipient of s.recipients) {
        const idempotencyKey = `activity-report-${s.company_id}-${period.end}-${recipient.toLowerCase()}`

        // log pending
        const { data: logRow } = await admin
          .from('activity_report_send_log')
          .insert({
            company_id: s.company_id,
            period_start: period.start,
            period_end: period.end,
            recipient_email: recipient,
            status: 'pending',
          })
          .select('id')
          .single()

        const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateName: 'weekly-activity-report',
            recipientEmail: recipient,
            idempotencyKey,
            templateData: {
              companyName,
              periodLabel: period.label,
              frequencyLabel,
              totalActiveEmployees,
              totalHours,
              noPunchEmployees,
              jobBreakdown,
            },
          }),
        })

        if (!resp.ok) {
          const txt = await resp.text()
          if (logRow?.id) {
            await admin.from('activity_report_send_log').update({ status: 'failed', error_message: txt }).eq('id', logRow.id)
          }
          recipientResults.push({ recipient, status: 'failed', error: txt })
        } else {
          if (logRow?.id) {
            await admin.from('activity_report_send_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', logRow.id)
          }
          recipientResults.push({ recipient, status: 'sent' })
        }
      }

      await admin
        .from('company_activity_report_settings')
        .update({ last_sent_period_end: period.end })
        .eq('id', s.id)

      results.push({
        companyId: s.company_id,
        companyName,
        period: period.label,
        totals: { totalActiveEmployees, totalHours, noPunch: noPunchEmployees.length, jobs: jobBreakdown.length },
        recipients: recipientResults,
      })
    } catch (err: any) {
      results.push({ companyId: s.company_id, status: 'error', error: err?.message ?? String(err) })
    }
  }

  return new Response(JSON.stringify({ success: true, todayEt: todayIso, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
