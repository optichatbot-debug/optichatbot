import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xbmdfbdehcxtsnecwbhi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibWRmYmRlaGN4dHNuZWN3YmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzAwMTIsImV4cCI6MjA5MTk0NjAxMn0._uS3PPtXYTPUzYTUFxoGkHtuvK1gvg-p_5dYRP8RrPI'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhibWRmYmRlaGN4dHNuZWN3YmhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM3MDAxMiwiZXhwIjoyMDkxOTQ2MDEyfQ.2VDk2152TIvMeZNYIBdh9srOg-NE2lh0XHFdUeHgvE0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function getTenantByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('widget_token', token)
    .single()
  if (error) return null
  return data
}

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

export async function searchProductsSemantic(tenantId: string, embedding: number[], limit = 5) {
  const { data, error } = await supabaseAdmin.rpc('match_products', {
    query_embedding: embedding,
    match_tenant_id: tenantId,
    match_threshold: 0.5,
    match_count: limit,
  })
  if (error) return []
  return data || []
}

export async function upsertConversation(tenantId: string, sessionId: string, messages: any[], channel = 'web', tone = 'amigable', extraMeta = {}) {
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

export async function getConversationHistory(tenantId: string, sessionId: string): Promise<any[]> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('messages')
    .eq('tenant_id', tenantId)
    .eq('session_id', sessionId)
    .single()
  return data?.messages || []
}

export async function getActiveFlows(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('flows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('priority', { ascending: false })
  return data || []
}

export async function getActivePromotions(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
  return data || []
}

export async function trackEvent(tenantId: string, eventType: string, channel: string, payload: Record<string, any>) {
  await supabaseAdmin.from('analytics').insert({
    tenant_id: tenantId,
    event_type: eventType,
    channel,
    payload,
  })
}

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