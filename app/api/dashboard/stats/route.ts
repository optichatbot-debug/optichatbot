import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  if (!tenantId) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [convsToday, totalContacts, waMessages, activeFlows] = await Promise.all([
    supabaseAdmin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', today.toISOString()),
    supabaseAdmin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'whatsapp'),
    supabaseAdmin
      .from('flows')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true),
  ])

  return NextResponse.json({
    conversaciones_hoy: convsToday.count ?? 0,
    contactos_totales: totalContacts.count ?? 0,
    mensajes_whatsapp: waMessages.count ?? 0,
    automatizaciones_activas: activeFlows.count ?? 0,
  })
}
