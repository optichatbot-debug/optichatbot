import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  if (!tenantId) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('flows')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flows: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, name, trigger_keywords, steps, active, priority } = await req.json()
    if (!tenant_id) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('flows')
      .insert({ tenant_id, name: name ?? 'Nuevo flujo', trigger_keywords: trigger_keywords ?? [], steps: steps ?? [], active: active ?? true, priority: priority ?? 0 })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flow: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
