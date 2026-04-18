import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, prompt } = await req.json()

    if (!tenant_id || !prompt) {
      return NextResponse.json({ error: 'tenant_id y prompt son requeridos' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: 'Generate a complete beautiful HTML landing page with inline CSS for: ' + prompt + '. Return ONLY the HTML code starting with <!DOCTYPE html>, nothing else, no markdown, no explanation.',
      }],
    })

    const html = (message.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined)?.text ?? ''
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
