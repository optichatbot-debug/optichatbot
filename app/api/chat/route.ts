import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import {
  getTenantByToken,
  getProducts,
  getActiveFlows,
  getActivePromotions,
  upsertConversation,
  getConversationHistory,
  matchFlow,
  trackEvent,
} from '@/lib/supabase'
import { chatWithOjito, detectPrescriptionInMessage } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, session_id, tenant_token, tone_override } = body

    if (!message || !tenant_token) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // 1. Identificar el tenant
    const tenant = await getTenantByToken(tenant_token)
    if (!tenant) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const sessionId = session_id || uuidv4()
    const tone = tone_override || tenant.tone || 'amigable'

    // 2. Obtener historial de conversación
    const history = await getConversationHistory(tenant.id, sessionId)

    // 3. Verificar si algún flujo es activado por palabra clave
    const flows = await getActiveFlows(tenant.id)
    const triggeredFlow = matchFlow(message, flows)

    // Si hay flujo triggerizado y tiene pasos, responder con el primero
    if (triggeredFlow && triggeredFlow.steps?.length > 0) {
      const firstStep = triggeredFlow.steps[0]
      const reply = firstStep.content

      // Guardar en historial
      const updatedMessages = [
        ...history,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ]
      await upsertConversation(tenant.id, sessionId, updatedMessages, 'web', tone)
      await trackEvent(tenant.id, 'chat_started', 'web', { flow_triggered: triggeredFlow.id })

      return NextResponse.json({
        reply,
        session_id: sessionId,
        flow_triggered: triggeredFlow.id,
      })
    }

    // 4. Obtener productos y promos del tenant
    const products = await getProducts(tenant.id)
    const promotions = await getActivePromotions(tenant.id)

    // 5. Llamar a Claude con Ojito
    const reply = await chatWithOjito({
      message,
      history,
      tenant,
      products,
      promotions,
      tone,
    })

    // 6. Guardar conversación actualizada
    const updatedMessages = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
    ]
    await upsertConversation(tenant.id, sessionId, updatedMessages, 'web', tone)

    // 7. Analytics
    const prescriptionDetected = detectPrescriptionInMessage(message)
    if (prescriptionDetected) {
      await trackEvent(tenant.id, 'prescription_captured', 'web', { session_id: sessionId })
    }
    await trackEvent(tenant.id, 'chat_started', 'web', { session_id: sessionId, message_count: updatedMessages.length })

    return NextResponse.json({
      reply,
      session_id: sessionId,
      prescription_detected: prescriptionDetected,
    })

  } catch (error) {
    console.error('Error en /api/chat:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// CORS para widget embebible en cualquier dominio
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
