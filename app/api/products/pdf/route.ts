import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const tenant_id = formData.get('tenant_id') as string | null

    if (!file || !tenant_id) {
      return NextResponse.json({ error: 'file y tenant_id son requeridos' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            } as any,
            {
              type: 'text',
              text: `Extrae todos los productos de este catálogo/documento.
Para cada producto devuelve un JSON array con este formato exacto:
[
  {
    "name": "nombre del producto",
    "category": "categoría (ej: Armazones, Lentes de contacto, Lentes solares, Accesorios)",
    "price": 0,
    "description": "descripción breve",
    "sku": "código si existe o null"
  }
]
Solo responde con el JSON array, sin markdown, sin texto adicional.
Si no encuentras productos, responde con []`,
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

    let products: Array<{ name: string; category: string; price: number; description: string; sku?: string }>
    try {
      products = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'No se pudo parsear la respuesta de Claude', raw }, { status: 500 })
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ inserted: 0, products: [] })
    }

    const rows = products.map(p => ({
      tenant_id,
      name: String(p.name || '').slice(0, 200),
      category: String(p.category || 'General').slice(0, 100),
      price: Number(p.price) || 0,
      description: String(p.description || '').slice(0, 500),
      sku: p.sku ? String(p.sku).slice(0, 100) : null,
      source: 'pdf' as const,
      active: true,
    }))

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(rows)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ inserted: data?.length ?? 0, products: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
