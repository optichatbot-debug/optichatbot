import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: Listar productos del tenant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const category = searchParams.get('category')

  if (!tenantId) return NextResponse.json({ error: 'tenant_id requerido' }, { status: 400 })

  let query = supabaseAdmin
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)

  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data })
}

// POST: Crear producto manual
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, name, category, price, description, image_url, sku } = body

    if (!tenant_id || !name || !price) {
      return NextResponse.json({ error: 'Faltan campos requeridos: tenant_id, name, price' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        tenant_id,
        name,
        category: category || 'General',
        price: parseFloat(price),
        description: description || '',
        image_url: image_url || null,
        sku: sku || null,
        source: 'manual',
        active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT: Actualizar producto
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, tenant_id, ...updates } = body

    if (!id || !tenant_id) {
      return NextResponse.json({ error: 'id y tenant_id requeridos' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })

  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE: Eliminar (desactivar) producto
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const tenantId = searchParams.get('tenant_id')

  if (!id || !tenantId) {
    return NextResponse.json({ error: 'id y tenant_id requeridos' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update({ active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
