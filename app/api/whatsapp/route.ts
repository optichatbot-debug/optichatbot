import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getTenantByToken, getProducts, getActiveFlows, getActivePromotions, upsertConversation, getConversationHistory, matchFlow, trackEvent } from '@/lib/supabase'
import { chatWithOjito } from '@/lib/claude'
import { sendWhatsAppMessage, markAsRead, extractWhatsAppMessage } from '@/lib/whatsapp'

// GET: Verificación del webhook de Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verificado')
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST: Recibir mensajes de WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verificar que sea un evento de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ok' })
    }

    const msg = extractWhatsAppMessage(body)
    if (!msg) {
      return NextResponse.json({ status: 'ok' }) // mensaje no de texto, ignorar
    }

    const { from, messageId, text, phoneNumberId } = msg

    // Marcar como leído inmediatamente
    await markAsRead(messageId, phoneNumberId)

    // Buscar tenant por número de WhatsApp
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('wa_phone_number_id', phoneNumberId)
      .single()

    if (!tenant) {
      console.warn(`Tenant no encontrado para phone_number_id: ${phoneNumberId}`)
      return NextResponse.json({ status: 'ok' })
    }

    const sessionId = `wa_${from}` // sesión por número de WhatsApp
    const tone = tenant.tone || 'amigable'

    // Obtener historial
    const history = await getConversationHistory(tenant.id, sessionId)

    // Verificar flujos
    const flows = await getActiveFlows(tenant.id)
    const triggeredFlow = matchFlow(text, flows)

    let reply: string

    if (triggeredFlow && triggeredFlow.steps?.length > 0) {
      reply = triggeredFlow.steps[0].content
    } else {
      const products = await getProducts(tenant.id)
      const promotions = await getActivePromotions(tenant.id)

      reply = await chatWithOjito({
        message: text,
        history,
        tenant,
        products,
        promotions,
        tone,
      })
    }

    // Guardar conversación
    const updatedMessages = [
      ...history,
      { role: 'user', content: text, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ]
    await upsertConversation(tenant.id, sessionId, updatedMessages, 'whatsapp', tone, { wa_from: from })

    // Enviar respuesta por WhatsApp
    await sendWhatsAppMessage(from, reply, phoneNumberId)

    // Analytics
    await trackEvent(tenant.id, 'whatsapp_message', 'whatsapp', {
      from,
      message_count: updatedMessages.length,
    })

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('Error en webhook WhatsApp:', error)
    // Siempre devolver 200 para que Meta no reintente
    return NextResponse.json({ status: 'ok' })
  }
}
