import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to   = searchParams.get('to')   || new Date().toISOString().split('T')[0]

  if (!tenantId) return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 })

  const [{ data: convs }, { data: events }] = await Promise.all([
    supabaseAdmin
      .from('conversations')
      .select('id, messages, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59'),
    supabaseAdmin
      .from('analytics')
      .select('id, event_type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59'),
  ])

  // Aggregate by date
  const convByDate: Record<string, number> = {}
  for (const c of convs ?? []) {
    const d = c.created_at.split('T')[0]
    convByDate[d] = (convByDate[d] || 0) + 1
  }

  const salesByDate: Record<string, number> = {}
  const chatsByDate: Record<string, number> = {}
  for (const e of events ?? []) {
    const d = e.created_at.split('T')[0]
    if (e.event_type === 'sale_closed')  salesByDate[d] = (salesByDate[d] || 0) + 1
    if (e.event_type === 'chat_started') chatsByDate[d] = (chatsByDate[d] || 0) + 1
  }

  // Build full date-range array
  const dates: string[] = []
  const startDate = new Date(from)
  const endDate   = new Date(to)
  for (const d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }

  const timeline = dates.map(d => ({
    fecha:          d,
    conversaciones: convByDate[d] || 0,
    ventas:         salesByDate[d] || 0,
    conversion:     chatsByDate[d] ? Math.round(((salesByDate[d] || 0) / chatsByDate[d]) * 100) : 0,
  }))

  // Temperature buckets based on message count
  const temp = { frio: 0, tibio: 0, caliente: 0 }
  for (const c of convs ?? []) {
    const msgs = Array.isArray(c.messages) ? c.messages.length : 0
    if (msgs <= 5)      temp.frio++
    else if (msgs <= 15) temp.tibio++
    else                 temp.caliente++
  }

  const totalVentas  = (events ?? []).filter(e => e.event_type === 'sale_closed').length
  const totalChats   = (events ?? []).filter(e => e.event_type === 'chat_started').length
  const conversion   = totalChats > 0 ? Math.round((totalVentas / totalChats) * 100) : 0

  return NextResponse.json({
    timeline,
    temperature: [
      { name: 'Frío',     value: temp.frio     },
      { name: 'Tibio',    value: temp.tibio    },
      { name: 'Caliente', value: temp.caliente },
    ],
    totals: { ventas: totalVentas, conversion },
  })
}
