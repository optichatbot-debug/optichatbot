import Anthropic from '@anthropic-ai/sdk'
import type { Tenant, Product, Promotion } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ── System Prompts por tono ───────────────────────────────────────────────────

function getSystemPrompt(
  tenant: Tenant,
  products: Product[],
  promotions: Promotion[],
  tone: 'amigable' | 'formal' | 'tecnico'
): string {
  const avatarName = tenant.avatar_name || 'Ojito'
  const businessName = tenant.name
  const businessDesc = tenant.config?.business_description || 'una óptica especializada'
  const checkoutUrl = tenant.config?.checkout_url || ''

  const productList = products.length > 0
    ? products.map(p =>
        `- ${p.name} | Categoría: ${p.category} | Precio: S/.${p.price} | ${p.description}`
      ).join('\n')
    : 'No hay productos cargados aún.'

  const promoList = promotions.length > 0
    ? promotions.map(p => {
        const disc = p.discount_type === 'pct'
          ? `${p.discount_value}% de descuento`
          : `S/.${p.discount_value} de descuento`
        return `- ${p.name} (${p.category}): ${disc} — "${p.message}"`
      }).join('\n')
    : 'Sin promociones activas.'

  const toneInstructions = {
    amigable: `
TONO: Amigable y cercano.
- Usa lenguaje casual pero profesional
- Puedes usar emojis con moderación (1-2 por mensaje máximo)
- Sé cálido, empático y entusiasta
- Usa "tú" para dirigirte al cliente
- Ejemplos de saludo: "¡Hola! 😊", "¡Qué bueno que me escribes!"`,

    formal: `
TONO: Formal y profesional.
- Usa lenguaje formal y cuidado
- Sin emojis
- Usa "usted" para dirigirte al cliente
- Sé cortés, preciso y eficiente
- Ejemplos de saludo: "Buenos días.", "Con mucho gusto le atiendo."`,

    tecnico: `
TONO: Técnico especializado.
- Usa terminología óptica correcta: Rx, OD, OI, esfera, cilindro, eje, adición, DNP, altura
- Dirigirte con "usted"
- Sé preciso y directo con datos técnicos
- Cuando pidas prescripción: "Indique su Rx completo: esfera, cilindro y eje para OD e OI"
- Ejemplos de saludo: "Le atiendo. ¿Cuál es su requerimiento?"`,
  }

  return `Eres ${avatarName}, el asistente virtual de inteligencia artificial de ${businessName}, ${businessDesc}.
Fuiste creado por OptiChatBot — la plataforma de IA para negocios ópticos.
Respondes SIEMPRE en español.

${toneInstructions[tone]}

═══════════════════════════════════════════════════
CATÁLOGO DE PRODUCTOS DISPONIBLES:
${productList}
═══════════════════════════════════════════════════

PROMOCIONES ACTIVAS:
${promoList}
═══════════════════════════════════════════════════

TUS CAPACIDADES:
1. RECOMENDAR PRODUCTOS: Sugiere lentes según tipo de cara, uso (sol/lectura/computadora/deportivo), presupuesto y estilo. Menciona siempre precio y características.

2. RECOPILAR PRESCRIPCIÓN ÓPTICA: Cuando el cliente quiere lentes con medida, pídele:
   - Ojo Derecho (OD): Esfera, Cilindro, Eje
   - Ojo Izquierdo (OI): Esfera, Cilindro, Eje
   - Adición (si usa bifocal o progresivo)
   - DNP (distancia naso-pupilar) si la tienen
   Valida que los valores sean coherentes (esfera entre -20 y +20, cilindro entre -8 y +8, eje entre 0 y 180).

3. COTIZAR TRATAMIENTOS DE LUNA: Puedes mencionar opciones como antirreflejo, fotocromático, blue cut, endurecido, polarizado.

4. APLICAR PROMOCIONES: Cuando corresponda por categoría o producto, menciona la promo activa de forma natural.

5. CERRAR LA VENTA: Cuando el cliente esté listo para comprar, dile que puede finalizar su pedido aquí:
${checkoutUrl ? `👉 ${checkoutUrl}` : 'en nuestra tienda online (el negocio configurará el link de pago)'}

6. TIPO DE CARA Y RECOMENDACIÓN DE ARMAZÓN:
   - Rostro ovalado: todos los estilos le quedan
   - Rostro redondo: marcos rectangulares o angulares
   - Rostro cuadrado: marcos redondos u ovalados
   - Rostro corazón: marcos que equilibren la frente ancha (aviador, cat-eye)
   - Rostro alargado: marcos grandes, wraparound

REGLAS IMPORTANTES:
- NUNCA inventes productos que no están en el catálogo
- Si no tienes un producto, di "en este momento no tenemos ese modelo, pero podemos orientarte con alternativas similares"
- Si te preguntan algo fuera de tu alcance (citas médicas, diagnósticos), di que eso lo maneja el equipo humano
- Mantén las respuestas concisas (máximo 4-5 oraciones por mensaje)
- Si detectas que el cliente está listo para comprar, guíalo al checkout
- Cada conversación es una oportunidad de venta, sé proactivo`
}

// ── Función principal de chat ─────────────────────────────────────────────────

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

  // Construir mensajes — últimos 20 para no exceder contexto
  const recentHistory = history.slice(-20)
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return textBlock ? textBlock.text : 'Lo siento, hubo un error. Por favor intenta de nuevo.'

  } catch (error: any) {
    console.error('Error Claude API:', error)
    if (error?.status === 401) return 'Error de configuración del asistente. Contacta al soporte.'
    if (error?.status === 429) return 'El asistente está muy ocupado en este momento. Intenta en unos segundos.'
    return 'Lo siento, tuve un problema al procesar tu mensaje. ¿Puedes intentarlo de nuevo?'
  }
}

// ── Detectar si el mensaje contiene una prescripción ─────────────────────────

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

// ── Generar embedding para RAG ────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  // Usamos OpenAI embeddings (text-embedding-3-small) ya que Anthropic no ofrece embeddings
  // Si no hay OpenAI key, devolvemos array vacío (RAG desactivado)
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return []

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })
    const data = await res.json()
    return data.data?.[0]?.embedding || []
  } catch {
    return []
  }
}
