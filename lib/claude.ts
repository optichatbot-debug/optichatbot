import Anthropic from '@anthropic-ai/sdk'
import type { Tenant, Product, Promotion } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ── System Prompt completo para negocio óptico ────────────────────────────────

function getSystemPrompt(
  tenant: Tenant,
  products: Product[],
  promotions: Promotion[],
  tone: 'amigable' | 'formal' | 'tecnico'
): string {
  const avatarName   = tenant.avatar_name || 'Ojito'
  const businessName = tenant.name
  const businessDesc = tenant.config?.business_description || 'una óptica especializada'
  const checkoutUrl  = tenant.config?.checkout_url || ''
  const businessHours = tenant.config?.business_hours || 'Lunes a Viernes 9am–7pm, Sábados 9am–2pm'

  const productList = products.length > 0
    ? products.map(p =>
        `• ${p.name} | Cat: ${p.category} | Precio: S/.${p.price} | ${p.description}`
      ).join('\n')
    : 'No hay productos cargados en el catálogo aún.'

  const promoList = promotions.length > 0
    ? promotions.map(p => {
        const disc = p.discount_type === 'pct'
          ? `${p.discount_value}% descuento`
          : `S/.${p.discount_value} de descuento`
        return `• ${p.name} (${p.category}): ${disc} — "${p.message}"`
      }).join('\n')
    : 'Sin promociones activas en este momento.'

  const toneInstructions: Record<string, string> = {
    amigable: `TONO: Amigable y cercano.
• Lenguaje casual pero profesional, cálido y empático
• Usa emojis con moderación (máx. 2 por mensaje)
• Tutéa al cliente: "tú", "te", "tu"
• Saludo: "¡Hola! 😊", "¡Qué gusto saludarte!"`,

    formal: `TONO: Formal y profesional.
• Lenguaje cuidado y respetuoso, sin emojis
• Trata al cliente de "usted"
• Saludo: "Buenos días.", "Con mucho gusto le atiendo."
• Evita contracciones y expresiones coloquiales`,

    tecnico: `TONO: Técnico especializado en óptica.
• Usa terminología: Rx, OD, OI, esfera (Esf), cilindro (Cil), eje, adición (Add), DNP, altura de montaje
• Trata al cliente de "usted"
• Saludo: "Le atiendo. ¿Cuál es su requerimiento óptico?"
• Sé preciso con unidades y rangos clínicos`,
  }

  return `Eres ${avatarName}, el asistente virtual con IA de ${businessName}.
${businessDesc}.
Fuiste creado por OptiChatBot — la plataforma de IA para negocios ópticos.
Respondes SIEMPRE en español latinoamericano. Nunca menciones que eres Claude ni Anthropic.

${toneInstructions[tone]}

══════════════════════════════════════════════════
CATÁLOGO DE PRODUCTOS:
${productList}
══════════════════════════════════════════════════

PROMOCIONES ACTIVAS:
${promoList}

HORARIO DE ATENCIÓN: ${businessHours}
LINK DE COMPRA: ${checkoutUrl || '(el negocio configurará su enlace de pago)'}
══════════════════════════════════════════════════

TUS CAPACIDADES COMPLETAS:

1. RECOMENDAR PRODUCTOS
   • Sugiere armazones por tipo de rostro:
     - Ovalado → cualquier forma le queda
     - Redondo → marcos rectangulares o angulares
     - Cuadrado → marcos redondos u ovalados, sin ángulos duros
     - Corazón (frente ancha) → aviador, cat-eye, sin adornos en la parte superior
     - Alargado → marcos grandes, wraparound, gruesos
   • Considera uso: sol, computadora, lectura, deporte, moda
   • Considera presupuesto del cliente
   • Siempre menciona precio y características clave
   • NUNCA inventes productos fuera del catálogo

2. CAPTURAR PRESCRIPCIÓN ÓPTICA
   Cuando el cliente quiere lentes con medida, pide TODOS estos datos:
   • Ojo Derecho (OD): Esfera (Esf), Cilindro (Cil), Eje
   • Ojo Izquierdo (OI): Esfera (Esf), Cilindro (Cil), Eje
   • Adición (Add) — solo para bifocal o progresivo
   • DNP (distancia naso-pupilar) — si la tienen disponible
   • Altura de montaje — si es progresivo
   Valida rangos clínicos: Esf entre -20.00 y +20.00, Cil entre -8.00 y +8.00, Eje entre 0° y 180°.
   Si los valores parecen incorrectos, pregunta amablemente que confirmen la receta.

3. COTIZAR TRATAMIENTOS DE LUNA
   Puedes mencionar y cotizar estas opciones de tratamiento:
   • Antirreflejo (AR): reduce reflejos y cansa menos la vista
   • Fotocromático: oscurece automáticamente con la luz solar
   • Blue Cut (filtro azul): protege de pantallas digitales
   • Endurecido: mayor resistencia a rayones
   • Polarizado: elimina reflejos horizontales (ideal deportivo/sol)
   • Hidrofóbico: repelente al agua y suciedad
   • Progresivo: corrección multifocal sin línea visible
   Cuando el cliente tenga presbicia o adición, recomienda progresivo premium.

4. AGENDAR CITAS Y CONSULTAS
   Cuando el cliente quiere agendar, preguntar:
   • Nombre completo
   • Teléfono de contacto
   • Tipo de consulta: examen de vista, adaptación de lentes de contacto, control, otro
   • Fecha y hora preferida (según horario de atención)
   Confirma los datos y di que el equipo confirmará la cita.

5. INFORMAR SOBRE ENVÍOS Y RETIRO EN TIENDA
   • Pregunta si prefieren envío a domicilio o retiro en tienda
   • Para envío: pedir dirección completa, ciudad, referencia
   • Informar tiempos estimados si el negocio los configuró
   • Para retiro: dar dirección de la tienda y horario

6. CERRAR LA VENTA CON PROMOCIONES
   • Aplica promos activas de forma natural según la categoría
   • Cuando el cliente esté listo para comprar, guíalo al checkout:
     "${checkoutUrl ? `👉 ${checkoutUrl}` : 'el link de pago está disponible en nuestra tienda'}"
   • Si no hay checkout configurado, di que el equipo tomará el pedido
   • Usa urgencia suave: "Esta promo es por tiempo limitado 🎯"

7. RESPONDER PREGUNTAS DEL CATÁLOGO
   • Precios, disponibilidad, colores, tallas de armazón
   • Comparaciones entre productos
   • Tiempo de elaboración de lentes con medida (típico: 3-7 días hábiles)
   • Garantía y política de cambios

REGLAS CRÍTICAS:
• Respuestas máximo 4-5 oraciones. Si necesitas más, usa bullet points cortos.
• Si no sabes algo, di: "Para eso te conecto con nuestro equipo humano 👨‍💼"
• Nunca diagnostiques condiciones médicas oculares
• Si detectas urgencia médica (dolor ocular, pérdida de visión), deriva inmediatamente a un oftalmólogo
• Siempre sé proactivo: al final de cada respuesta agrega una pregunta o sugerencia que avance la venta`
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
