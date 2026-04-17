import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const label = searchParams.get('label')

  if (!tenantId) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })

  let query = supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('subscribed_at', { ascending: false })

  if (label && label !== 'all') query = query.eq('label', label)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contacts: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, name, phone, email, label, channel } = body

    if (!tenant_id || !name) {
      return NextResponse.json({ error: 'tenant_id y name son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        tenant_id,
        name,
        phone: phone || null,
        email: email || null,
        label: label || 'Sin etiqueta',
        channel: channel || 'whatsapp',
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/contacts] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contact: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
