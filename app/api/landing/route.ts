import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateLandingHTML } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, prompt, name } = await req.json()

    if (!tenant_id || !prompt) {
      return NextResponse.json({ error: 'tenant_id y prompt son requeridos' }, { status: 400 })
    }

    // Obtener datos del tenant para personalizar la landing
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, config')
      .eq('id', tenant_id)
      .single()

    const businessName  = tenant?.name ?? 'Mi Óptica'
    const primaryColor  = tenant?.config?.primary_color ?? '#2563EB'

    // Llamar a Claude para generar el HTML
    const htmlContent = await generateLandingHTML(prompt, businessName, primaryColor)

    return NextResponse.json({ html: htmlContent })
  } catch (error) {
    console.error('[POST /api/landing] error:', error)
    const msg = error instanceof Error ? error.message : 'Error generando landing'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { tenant_id, prompt, html_content, name } = await req.json()

    if (!tenant_id || !html_content) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('landings')
      .insert({
        tenant_id,
        name: name || 'Landing generada con IA',
        prompt: prompt || '',
        html_content,
      })
      .select()
      .single()

    if (error) {
      console.error('[PUT /api/landing] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ landing: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error guardando landing' }, { status: 500 })
  }
}
