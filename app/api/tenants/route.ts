import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, user_id } = body

    console.log('[/api/tenants POST] payload:', { name, email, user_id })

    if (!name || !email) {
      console.log('[/api/tenants POST] missing fields')
      return NextResponse.json({ error: 'Faltan campos: name y email son requeridos' }, { status: 400 })
    }

    // Upsert: si el tenant ya existe para ese email lo devuelve sin error
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .upsert(
        {
          name,
          email,
          plan: 'free',
          tone: 'amigable',
          avatar_name: 'Ojito',
          config: {
            primary_color: '#2563EB',
            business_description: name,
          },
        },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (error) {
      console.error('[/api/tenants POST] Supabase error:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    console.log('[/api/tenants POST] tenant created/found:', data?.id)
    return NextResponse.json({ tenant: data }, { status: 201 })
  } catch (err) {
    console.error('[/api/tenants POST] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
