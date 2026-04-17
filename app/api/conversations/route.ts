import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const channel = searchParams.get('channel')

  if (!tenantId) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })

  let query = supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (channel && channel !== 'all') {
    query = query.eq('channel', channel)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ conversations: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, session_id, message } = await req.json()

    if (!tenant_id || !session_id || !message) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }

    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('messages, channel, metadata')
      .eq('tenant_id', tenant_id)
      .eq('session_id', session_id)
      .single()

    if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

    const newMsg = {
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString(),
      manual: true,
    }

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ messages: [...(conv.messages ?? []), newMsg] })
      .eq('tenant_id', tenant_id)
      .eq('session_id', session_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send via WhatsApp if applicable
    if (conv.channel === 'whatsapp' && conv.metadata?.phone_number) {
      const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('wa_phone_number_id')
        .eq('id', tenant_id)
        .single()

      if (tenantData?.wa_phone_number_id) {
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
        await sendWhatsAppMessage(
          conv.metadata.phone_number,
          message,
          tenantData.wa_phone_number_id
        )
      }
    }

    return NextResponse.json({ ok: true, message: newMsg })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
