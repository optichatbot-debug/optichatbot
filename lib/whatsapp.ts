const WA_API_URL = 'https://graph.facebook.com/v19.0'

/**
 * Enviar mensaje de texto vía WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  phoneNumberId?: string
): Promise<boolean> {
  const phone_number_id = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  if (!phone_number_id || !token) {
    console.error('WhatsApp: faltan variables de entorno')
    return false
  }

  try {
    const res = await fetch(`${WA_API_URL}/${phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('WhatsApp API error:', err)
      return false
    }

    return true
  } catch (error) {
    console.error('Error enviando WhatsApp:', error)
    return false
  }
}

/**
 * Enviar mensaje con botones de respuesta rápida
 */
export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
  phoneNumberId?: string
): Promise<boolean> {
  const phone_number_id = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  if (!phone_number_id || !token) return false

  try {
    const res = await fetch(`${WA_API_URL}/${phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: body },
          action: {
            buttons: buttons.slice(0, 3).map(b => ({
              type: 'reply',
              reply: { id: b.id, title: b.title.substring(0, 20) },
            })),
          },
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Marcar mensaje como leído
 */
export async function markAsRead(
  messageId: string,
  phoneNumberId?: string
): Promise<void> {
  const phone_number_id = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN
  if (!phone_number_id || !token) return

  await fetch(`${WA_API_URL}/${phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch(() => {})
}

/**
 * Extraer texto del mensaje entrante de WhatsApp
 */
export function extractWhatsAppMessage(body: any): {
  from: string
  messageId: string
  text: string
  phoneNumberId: string
} | null {
  try {
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const message = value?.messages?.[0]

    if (!message || message.type !== 'text') return null

    return {
      from: message.from,
      messageId: message.id,
      text: message.text.body,
      phoneNumberId: value.metadata.phone_number_id,
    }
  } catch {
    return null
  }
}
