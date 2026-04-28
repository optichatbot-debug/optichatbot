import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, prompt } = await req.json()

    if (!tenant_id || !prompt) {
      return NextResponse.json({ error: 'tenant_id y prompt son requeridos' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent('Generate a complete beautiful modern HTML landing page with inline CSS and JS for: ' + prompt + '. Return ONLY the HTML code starting with <!DOCTYPE html>, nothing else.')
    const html = result.response.text()

    return NextResponse.json({ html })
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
