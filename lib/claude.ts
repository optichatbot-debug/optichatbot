import Anthropic from '@anthropic-ai/sdk'
import type { Tenant, Product, Promotion } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ── System Prompt dinámico usando toda la config del tenant ──────────────────

function getSystemPrompt(
  tenant: Tenant,
  products: Product[],
  promotions: Promotion[],
  _tone: 'amigable' | 'formal' | 'tecnico'
): string {
  const c = tenant.config ?? {}

  // Identity
  const sellerName     = c.seller_name     || tenant.avatar_name || 'Asistente'
  const sellerGender   = c.seller_gender   || 'Neutro'
  const companyName    = c.company_name    || tenant.name        || 'esta empresa'
  const country        = c.country         || 'Latinoamérica'
  const companyDesc    = c.business_description || ''
  const audience       = c.audience        || ''
  const instrEspeciales = c.instrucciones_especiales || ''

  // Personality
  const aiRules      = c.ai_rules              || ''
  const commStyle    = c.communication_style   || ''
  const salesStyle   = c.sales_style           || ''
  const respLen      = c.response_length       || 'equilibrado'
  const useEmojis    = c.use_emojis !== false
  const useSigns     = c.use_opening_signs     || false
  const forbidden    = (c.forbidden_words      || []) as string[]
  const emojiPalette = c.emoji_palette         || ''

  // Messages
  const handoffMsg = c.human_handoff_message || 'Voy a conectarte con un asesor de nuestro equipo. Un momento por favor.'

  // Business hours
  const alwaysOn = c.always_on !== false
  const schedule  = (c.schedule || {}) as Record<string, { active?: boolean; from?: string; to?: string }>
  const outHrsMsg = c.outside_hours_message || ''

  // Products
  const productList = products.length > 0
    ? products.map(p => `• ${p.name} | Cat: ${p.category} | Precio: S/.${p.price}${p.description ? ` | ${p.description}` : ''}`).join('\n')
    : 'No hay productos cargados en el catálogo aún.'

  // Promotions (from DB + from config)
  type CfgPromo = { name?: string; discount?: string; desc?: string; conditions?: string }
  const cfgPromos = (c.ai_promotions || []) as CfgPromo[]
  const promoLines: string[] = [
    ...promotions.map(p => {
      const d = p.discount_type === 'pct' ? `${p.discount_value}% de descuento` : `S/.${p.discount_value} de descuento`
      return `• ${p.name}${p.category ? ` (${p.category})` : ''}: ${d}${p.message ? ` — "${p.message}"` : ''}`
    }),
    ...cfgPromos.filter(p => p.name).map(p =>
      `• ${p.name}${p.discount ? `: ${p.discount}` : ''}${p.desc ? ` — ${p.desc}` : ''}${p.conditions ? ` (activar cuando: ${p.conditions})` : ''}`
    ),
  ]
  const promoList = promoLines.length > 0 ? promoLines.join('\n') : 'Sin promociones activas en este momento.'

  // Business hours summary
  let hoursText = 'Disponible 24/7'
  if (!alwaysOn) {
    const activeHours = Object.entries(schedule)
      .filter(([, d]) => d.active)
      .map(([name, d]) => `${name}: ${d.from || '09:00'}–${d.to || '18:00'}`)
    hoursText = activeHours.length > 0 ? activeHours.join(', ') : 'Ver horario configurado'
  }

  // Payment methods
  type CfgPay = { selected?: boolean; name?: string; tipo?: string; nombre_entidad?: string; instructions?: string }
  const payMethods = ((c.payment_methods || []) as CfgPay[]).filter(m => m.selected)
  const payLines = payMethods.map(m => {
    let line = `• ${m.name || ''}${m.tipo ? ` (${m.tipo})` : ''}`
    if (m.nombre_entidad) line += ` — ${m.nombre_entidad}`
    if (m.instructions) line += `\n  Instrucciones: ${m.instructions}`
    return line
  })
  const payText = payLines.length > 0 ? payLines.join('\n') : 'Los métodos de pago serán indicados por el equipo.'

  // Shipping
  type CfgShip = { zone_name?: string; payment_types?: string; cash_on_delivery?: boolean; partial_payment?: boolean; partial_amount?: string; zones?: Array<{ name?: string; price?: string; desc?: string }> }
  const ship = (c.shipping || {}) as CfgShip
  const shipLines: string[] = []
  if (ship.zone_name) shipLines.push(`Zona: ${ship.zone_name}`)
  if (ship.payment_types) shipLines.push(`Tipos de pago: ${ship.payment_types}`)
  if (ship.cash_on_delivery) shipLines.push('Acepta contraentrega')
  if (ship.partial_payment && ship.partial_amount) shipLines.push(`Pago parcial mínimo: ${ship.partial_amount}`)
  if (Array.isArray(ship.zones)) {
    ship.zones.forEach(z => { if (z.name) shipLines.push(`  "${z.name}": ${z.price || '?'}${z.desc ? ` — ${z.desc}` : ''}`) })
  }

  // FAQs
  type CfgFaq = { question?: string; answer?: string }
  const faqs = (c.faqs || []) as CfgFaq[]
  const faqText = faqs.length > 0
    ? faqs.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')
    : ''

  // Response length instruction
  const lenMap: Record<string, string> = {
    muy_conciso: '1-2 oraciones máximo',
    conciso: '2-3 oraciones',
    equilibrado: '3-4 oraciones o bullets cortos',
    detallado: 'respuestas completas con contexto',
    muy_detallado: 'respuestas muy completas y detalladas',
  }

  const genderNote = sellerGender === 'Femenino' ? ' (femenino)' : sellerGender === 'Masculino' ? ' (masculino)' : ''

  return `Eres ${sellerName}${genderNote}, asistente virtual de ventas de ${companyName} (${country}).
${companyDesc ? companyDesc + '\n' : ''}${audience ? `Clientes objetivo: ${audience}\n` : ''}
IDENTIDAD: Nunca menciones Claude, Anthropic u otra IA. Siempre eres ${sellerName} de ${companyName}. Responde SIEMPRE en español latinoamericano.

══════════════════════════════════════════════════
CATÁLOGO DE PRODUCTOS:
${productList}

PROMOCIONES ACTIVAS:
${promoList}

MÉTODOS DE PAGO:
${payText}

HORARIO: ${hoursText}${!alwaysOn && outHrsMsg ? `\nFuera de horario: "${outHrsMsg}"` : ''}
${shipLines.length > 0 ? '\nENVÍOS:\n' + shipLines.join('\n') : ''}
${faqText ? '\nPREGUNTAS FRECUENTES:\n' + faqText : ''}
${c.claims_instructions ? '\nMANEJO DE RECLAMOS:\n' + c.claims_instructions : ''}
${c.returns_policy ? '\nDEVOLUCIONES:\n' + c.returns_policy : ''}
${c.other_info ? '\nINFORMACIÓN ADICIONAL:\n' + c.other_info : ''}
══════════════════════════════════════════════════

PERSONALIDAD:
${commStyle ? '• Estilo de comunicación: ' + commStyle : ''}
${salesStyle ? '• Estilo de ventas: ' + salesStyle : ''}
${aiRules ? '• Reglas: ' + aiRules : ''}
${instrEspeciales ? '• Instrucciones especiales: ' + instrEspeciales : ''}

FORMATO:
• Longitud: ${lenMap[respLen] || '3-4 oraciones'}
• Emojis: ${useEmojis ? `Sí, con moderación${emojiPalette ? ` (paleta: ${emojiPalette})` : ' (máx. 2 por mensaje)'}` : 'NO uses emojis'}
• Signos de apertura ¡¿: ${useSigns ? 'Sí' : 'No'}
${forbidden.length > 0 ? '• NUNCA uses: ' + forbidden.join(', ') : ''}

INSTRUCCIONES:
• Recomienda solo productos del catálogo. NUNCA inventes productos ni precios.
• Al final de cada respuesta agrega una pregunta o sugerencia que avance la conversación.
• Si no puedes resolver algo, di: "${handoffMsg}"`
}

// ── Chat principal ────────────────────────────────────────────────────────────

export async function chatWithOjito(params: {
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  tenant: Tenant
  products: Product[]
  promotions: Promotion[]
  tone?: 'amigable' | 'formal' | 'tecnico'
}): Promise<string> {
  const { message, history, tenant, products, promotions } = params
  const tone = params.tone || tenant.tone || 'amigable'

  const systemPrompt = getSystemPrompt(tenant, products, promotions, tone)
  const recentHistory = history.slice(-20)

  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: systemPrompt,
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return textBlock ? textBlock.text : 'Lo siento, hubo un error. Por favor intenta de nuevo.'
  } catch (error: unknown) {
    console.error('Error Claude API:', error)
    const e = error as { status?: number }
    if (e?.status === 401) return 'Error de configuración del asistente. Contacta al soporte.'
    if (e?.status === 429) return 'El asistente está muy ocupado ahora mismo. Intenta en unos segundos.'
    return 'Lo siento, tuve un problema procesando tu mensaje. ¿Puedes intentarlo de nuevo?'
  }
}

// ── Generar landing page HTML con IA ─────────────────────────────────────────

export async function generateLandingHTML(
  description: string,
  businessName: string,
  primaryColor = '#2563EB'
): Promise<string> {
  const prompt = `Genera una landing page HTML completa, moderna y lista para publicar para el siguiente negocio óptico:

DESCRIPCIÓN: ${description}
NOMBRE DEL NEGOCIO: ${businessName}
COLOR PRINCIPAL: ${primaryColor}

REQUISITOS TÉCNICOS:
- HTML completo válido (<!DOCTYPE html>...)
- CSS completamente inline o en <style> en el <head>
- Sin dependencias externas excepto Google Fonts (puedes usar 1 fuente)
- Mobile-first y completamente responsive
- Sin JavaScript externo, solo vanilla JS si es necesario

SECCIONES OBLIGATORIAS:
1. Header/Nav con logo (texto) y menú
2. Hero llamativo con CTA principal
3. Servicios/Productos destacados (mínimo 3 cards)
4. Por qué elegirnos / Diferenciadores (con íconos emoji)
5. Sección de contacto o formulario simple
6. Footer con copyright

ESTILO:
- Diseño moderno tipo SaaS/startup pero adaptado a óptica
- Color primario: ${primaryColor}
- Tipografía limpia y legible
- Espaciado generoso
- Sombras suaves
- Bordes redondeados
- Gradientes sutiles

SOLO devuelve el HTML completo. Sin explicaciones, sin markdown, sin bloques de código. Solo el HTML empezando con <!DOCTYPE html>.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return textBlock?.text ?? '<html><body><h1>Error generando la landing</h1></body></html>'
  } catch (error) {
    console.error('Error generando landing:', error)
    throw new Error('No se pudo generar la landing. Verifica tu API key de Claude.')
  }
}

// ── Detectar prescripción en mensaje ─────────────────────────────────────────

export function detectPrescriptionInMessage(message: string): boolean {
  const patterns = [
    /[-+]?\d+[.,]\d+\s*(esf|sph|cil|cyl)/i,
    /OD|OI|ojo derecho|ojo izquierdo/i,
    /\d+°|\d+ grados/i,
    /esfera|cilindro|eje|adici[oó]n/i,
    /rx:|receta:|prescripci[oó]n:/i,
  ]
  return patterns.some(p => p.test(message))
}

// ── Embedding para RAG ────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return []

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    })
    const data = await res.json()
    return data.data?.[0]?.embedding || []
  } catch {
    return []
  }
}
