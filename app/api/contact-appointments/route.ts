import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contact_id')
  const tenantId = searchParams.get('tenant_id')

  if (!contactId || !tenantId) {
    return NextResponse.json({ error: 'contact_id y tenant_id son requeridos' }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('contact_appointments')
      .select('*')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('fecha', { ascending: true })

    if (error) {
      // If table doesn't exist, return empty array gracefully
      console.warn('[GET /api/contact-appointments]', error.message)
      return NextResponse.json({ appointments: [] })
    }

    return NextResponse.json({ appointments: data ?? [] })
  } catch {
    return NextResponse.json({ appointments: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contact_id, tenant_id } = body

    if (!contact_id || !tenant_id) {
      return NextResponse.json({ error: 'contact_id y tenant_id son requeridos' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('contact_appointments')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('[POST /api/contact-appointments]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointment: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
