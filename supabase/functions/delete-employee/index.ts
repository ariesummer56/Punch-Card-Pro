import { corsHeaders } from 'npm:@supabase/supabase-js@2.105.1/cors'
import { createClient } from 'npm:@supabase/supabase-js@2.105.1'
import { z } from 'npm:zod@3.25.76'

const BodySchema = z.object({
  employeeUserId: z.string().uuid(),
})

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Server configuration is missing' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Authentication required' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return jsonResponse({ error: 'Invalid session' }, 401)

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400)

  const callerId = userData.user.id
  const targetUserId = parsed.data.employeeUserId
  if (callerId === targetUserId) return jsonResponse({ error: 'Admins cannot delete their own profile here' }, 400)

  const { data: callerRole, error: callerRoleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .eq('role', 'admin')
    .maybeSingle()
  if (callerRoleError || !callerRole) return jsonResponse({ error: 'Admin access required' }, 403)

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('company_id')
    .eq('user_id', callerId)
    .maybeSingle()
  if (callerProfileError || !callerProfile?.company_id) return jsonResponse({ error: 'Admin company profile is required' }, 403)

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('user_id, company_id, display_name, email')
    .eq('user_id', targetUserId)
    .maybeSingle()
  if (targetProfileError || !targetProfile) return jsonResponse({ error: 'Employee profile not found' }, 404)
  if (targetProfile.company_id !== callerProfile.company_id) return jsonResponse({ error: 'Employee is outside your company' }, 403)

  const { data: targetRole, error: targetRoleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', targetUserId)
    .maybeSingle()
  if (targetRoleError) return jsonResponse({ error: targetRoleError.message }, 500)
  if ((targetRole?.role ?? 'employee') !== 'employee') return jsonResponse({ error: 'Only employee profiles can be deleted here' }, 400)

  const deleteSteps = [
    adminClient.from('employee_job_assignments').delete().eq('employee_user_id', targetUserId),
    adminClient.from('employee_pto_balances').delete().eq('employee_user_id', targetUserId),
    adminClient.from('employee_weekly_report_overrides').delete().eq('employee_user_id', targetUserId),
    adminClient.from('employee_holiday_pay').delete().eq('employee_user_id', targetUserId),
    adminClient.from('time_off_requests').delete().eq('employee_user_id', targetUserId),
    adminClient.from('time_entries').delete().eq('employee_user_id', targetUserId),
    adminClient.from('user_roles').delete().eq('user_id', targetUserId),
    adminClient.from('profiles').delete().eq('user_id', targetUserId),
  ]

  for (const step of deleteSteps) {
    const { error } = await step
    if (error) return jsonResponse({ error: error.message }, 500)
  }

  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId)
  if (deleteAuthError && !deleteAuthError.message.toLowerCase().includes('not found')) {
    return jsonResponse({ error: deleteAuthError.message }, 500)
  }

  return jsonResponse({ ok: true, deletedUserId: targetUserId })
})
