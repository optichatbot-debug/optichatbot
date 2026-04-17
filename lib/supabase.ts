import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client para el browser (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin para server-side (service role — NUNCA en browser)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Obtener tenant por su widget_token público
 */
export async function getTenantByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('widget_token', token)
    .single()
  if (error) return null
  return data
}

/**
 * Obtener productos activos de un tenant
 */
export async function getProducts(tenantId: string, category?: string) {
  let query = supabaseAdmin
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  if (category) query = query.eq('category', category)

  const { data } = await query.order('created_at', { ascending: false })
  return data || []
}

/**
 * Buscar productos por similitud semántica (RAG con pgvector)
 */
export async function searchProductsSemantic(
  tenantId: string,
  embedding: number[],
  limit = 5
) {
  const { data, error } = await supabaseAdmin.rpc('match_products', {
    query_embedding: embedding,
    match_tenant_id: tenantId,
    match_threshold: 0.5,
    match_count: limit,
  })
  if (error) {
    console.error('Error búsqueda semántica:', error)
    return []
  }
  return data || []
}

/**
 * Guardar o actualizar conversación
 */
export async function upsertConversation(
  tenantId: string,
  sessionId: string,
  messages: any[],
  channel = 'web',
  tone = 'amigable',
  extraMeta = {}
) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .upsert({
      tenant_id: tenantId,
      session_id: sessionId,
      channel,
      messages,
      tone,
      metadata: extraMeta,
    }, { onConflict: 'tenant_id,session_id' })
    .select()
    .single()

  if (error) console.error('Error guardando conversación:', error)
  return data
}

/**
 * Obtener historial de conversación por sesión
 */
export async function getConversationHistory(
  tenantId: string,
  sessionId: string
): Promise<any[]> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('messages')
    .eq('tenant_id', tenantId)
    .eq('session_id', sessionId)
    .single()

  return data?.messages || []
}

/**
 * Obtener flujos activos de un tenant
 */
export async function getActiveFlows(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('flows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('priority', { ascending: false })
  return data || []
}

/**
 * Obtener promociones activas de un tenant
 */
export async function getActivePromotions(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
  return data || []
}

/**
 * Registrar evento de analytics
 */
export async function trackEvent(
  tenantId: string,
  eventType: string,
  channel: string,
  payload: Record<string, any>
) {
  await supabaseAdmin.from('analytics').insert({
    tenant_id: tenantId,
    event_type: eventType,
    channel,
    payload,
  })
}

/**
 * Detectar si se disparó algún flujo por palabra clave
 */
export function matchFlow(message: string, flows: any[]) {
  const lower = message.toLowerCase()
  for (const flow of flows) {
    const triggered = flow.trigger_keywords?.some((kw: string) =>
      lower.includes(kw.toLowerCase())
    )
    if (triggered) return flow
  }
  return null
}
