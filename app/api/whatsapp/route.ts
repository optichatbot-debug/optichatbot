import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getProducts, getActiveFlows, getActivePromotions, upsertConversation, getConversationHistory, matchFlow, trackEvent } from '@/lib/supabase'
import { chatWithOjito } from '@/lib/claude'
import { sendWhatsAppMessage, markAsRead, extractWhatsAppMessage } from '@/lib/whatsapp'

// GET: Verificación del webhook de Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verificado')
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST: Recibir mensajes de WhatsApp (Meta o 360dialog)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { searchParams } = new URL(req.url)

    // ── Detectar formato ─────────────────────────────────────────────────────
    const is360Dialog = Array.isArray(body.messages) && !body.object
    const isMeta      = body.object === 'whatsapp_business_account'

    if (!is360Dialog && !isMeta) {
      return NextResponse.json({ status: 'ok' })
    }

    // ── Extraer mensaje ──────────────────────────────────────────────────────
    let from: string
    let text: string
    let messageId: string
    let phoneNumberId: string | null = null
    let tenant: Record<string, unknown> | null = null

    if (is360Dialog) {
      const msg = body.messages[0]
      if (!msg || msg.type !== 'text') return NextResponse.json({ status: 'ok' })
      from        = msg.from
      text        = msg.text?.body || ''
      messageId   = msg.id

      // Find tenant via query param ?tid= or by 360dialog key match
      const tid = searchParams.get('tid') || searchParams.get('tenant_id')
      if (tid) {
        const { data } = await supabaseAdmin.from('tenants').select('*').eq('id', tid).single()
        tenant = data
      } else {
        // Fallback: first tenant with a 360dialog key (single-tenant setup)
        const { data } = await supabaseAdmin
          .from('tenants').select('*').not('wa_360dialog_key', 'is', null).limit(1).single()
        tenant = data
      }
    } else {
      // Meta format
      const msg = extractWhatsAppMessage(body)
      if (!msg) return NextResponse.json({ status: 'ok' })
      from          = msg.from
      text          = msg.text
      messageId     = msg.messageId
      phoneNumberId = msg.phoneNumberId

      await markAsRead(messageId, phoneNumberId)

      const { data } = await supabaseAdmin
        .from('tenants').select('*').eq('wa_phone_number_id', phoneNumberId).single()
      tenant = data
    }

    if (!tenant || !text) {
      console.warn('Tenant no encontrado o mensaje vacío')
      return NextResponse.json({ status: 'ok' })
    }

    const sessionId = `wa_${from}`
    const tone      = (tenant.tone as 'amigable' | 'formal' | 'tecnico') || 'amigable'

    // Obtener historial y verificar flujos
    const history       = await getConversationHistory(tenant.id as string, sessionId)
    const flows         = await getActiveFlows(tenant.id as string)
    const triggeredFlow = matchFlow(text, flows)

    let reply: string

    if (triggeredFlow && triggeredFlow.steps?.length > 0) {
      reply = triggeredFlow.steps[0].content
    } else {
      const products   = await getProducts(tenant.id as string)
      const promotions = await getActivePromotions(tenant.id as string)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reply = await chatWithOjito({ message: text, history, tenant: tenant as any, products, promotions, tone })
    }

    // Guardar conversación
    const updatedMessages = [
      ...history,
      { role: 'user',      content: text,  timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ]
    await upsertConversation(tenant.id as string, sessionId, updatedMessages, 'whatsapp', tone, { wa_from: from })
    await trackEvent(tenant.id as string, 'whatsapp_message', 'whatsapp', { from, message_count: updatedMessages.length })

    // ── Enviar respuesta ─────────────────────────────────────────────────────
    if (is360Dialog) {
      const key = tenant.wa_360dialog_key as string
      await fetch('https://waba.360dialog.io/v1/messages', {
        method: 'POST',
        headers: {
          'D360-API-KEY': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_type: 'individual',
          to: from,
          type: 'text',
          text: { body: reply },
        }),
      })
    } else {
      await sendWhatsAppMessage(from, reply, phoneNumberId!)
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    return NextResponse.json({ status: 'ok' })
  }
}
