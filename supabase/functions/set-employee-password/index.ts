import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const BodySchema = z.object({
  target_user_id: z.string().uuid(),
  new_password: z.string().min(8).max(128),
})

const weakPasswordMessage = 'That password is too common or easy to guess. Please choose a stronger password, or use the Generate button.'

function isKnownWeakPassword(password: string) {
  const normalized = password.trim().toLowerCase()
  return /^(password|password\d+|12345678|qwerty\d*|letmein\d*|welcome\d*|admin\d*|changeme\d*)$/.test(normalized)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsRes?.claims) return json({ error: 'Unauthorized' }, 401)
    const callerId = claimsRes.claims.sub as string

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, 400)
    }
    const { target_user_id, new_password } = parsed.data

    if (isKnownWeakPassword(new_password)) {
      return json({ ok: false, error: weakPasswordMessage, code: 'weak_password' })
    }

    if (target_user_id === callerId) {
      return json({ error: "Use your own profile's password change to update your password." }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // Caller must be admin
    const { data: callerRoles, error: rolesErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    if (rolesErr) return json({ error: rolesErr.message }, 500)
    const isAdmin = (callerRoles ?? []).some((r) => r.role === 'admin')
    if (!isAdmin) return json({ error: 'Admin permission required' }, 403)

    // Same company guard
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('user_id, company_id')
      .in('user_id', [callerId, target_user_id])
    if (profErr) return json({ error: profErr.message }, 500)

    const callerCompany = profiles?.find((p) => p.user_id === callerId)?.company_id
    const targetCompany = profiles?.find((p) => p.user_id === target_user_id)?.company_id
    if (!callerCompany || !targetCompany || callerCompany !== targetCompany) {
      return json({ error: 'Employee not found in your company' }, 403)
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(target_user_id, {
      password: new_password,
    })
    if (updErr) {
      if (/weak|easy to guess|pwned|breached/i.test(updErr.message)) {
        return json({ ok: false, error: weakPasswordMessage, code: 'weak_password' })
      }
      return json({ error: updErr.message }, 400)
    }

    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Unexpected error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
