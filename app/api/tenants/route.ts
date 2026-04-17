import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { name, email, user_id } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        name,
        email,
        plan: 'free',
        tone: 'amigable',
        avatar_name: 'Ojito',
        config: {
          primary_color: '#2563EB',
          business_description: name,
        },
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tenant: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}