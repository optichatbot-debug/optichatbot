import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = auth.slice(7)
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let tenant = null

  // 1. Try lookup by user_id (robust: column may not exist yet)
  try {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    tenant = data
  } catch {
    // user_id column doesn't exist yet — skip
  }

  // 2. Fall back to email lookup
  if (!tenant) {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('email', user.email!)
      .maybeSingle()
    tenant = data

    // Back-fill user_id if column now exists
    if (tenant) {
      try {
        await supabaseAdmin
          .from('tenants')
          .update({ user_id: user.id })
          .eq('id', tenant.id)
        tenant = { ...tenant, user_id: user.id }
      } catch {
        // Column doesn't exist yet — ignore, tenant is still valid
      }
    }
  }

  // 3. Auto-create tenant for any authenticated user who has no record
  if (!tenant) {
    const name = (user.user_metadata?.full_name as string | undefined)
      ?? user.email!.split('@')[0]

    const insertPayload: Record<string, unknown> = {
      name,
      email: user.email!,
      plan: 'free',
      tone: 'amigable',
      avatar_name: 'Asistente IA',
      config: { primary_color: '#2563EB', business_description: '' },
    }

    // Include user_id if column exists (insert will silently ignore unknown columns only via try/catch)
    try {
      const { data: withUserId, error: e1 } = await supabaseAdmin
        .from('tenants')
        .insert({ ...insertPayload, user_id: user.id })
        .select()
        .single()
      if (!e1) tenant = withUserId
    } catch {
      // user_id column doesn't exist yet — insert without it
    }

    if (!tenant) {
      const { data: withoutUserId } = await supabaseAdmin
        .from('tenants')
        .insert(insertPayload)
        .select()
        .single()
      tenant = withoutUserId
    }
  }

  return NextResponse.json({ tenant: tenant ?? null })
}
