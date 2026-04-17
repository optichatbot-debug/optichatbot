import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, shop_url, access_token } = await req.json()

    if (!tenant_id || !shop_url || !access_token) {
      return NextResponse.json({ error: 'Faltan campos: tenant_id, shop_url, access_token' }, { status: 400 })
    }

    // Normalizar URL de la tienda
    const domain = shop_url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/\.myshopify\.com.*/, '')
    const shopDomain = `${domain}.myshopify.com`

    // Llamar a Shopify REST Admin API
    const shopifyRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products.json?limit=100&status=active`,
      {
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!shopifyRes.ok) {
      const err = await shopifyRes.json().catch(() => ({}))
      console.error('[Shopify import] error:', shopifyRes.status, err)
      return NextResponse.json(
        { error: `Error Shopify ${shopifyRes.status}: verifica la URL y el token` },
        { status: 400 }
      )
    }

    const { products: shopifyProducts } = await shopifyRes.json()

    if (!shopifyProducts?.length) {
      return NextResponse.json({ imported: 0, message: 'No se encontraron productos activos' })
    }

    // Mapear productos de Shopify al schema de OptiChatBot
    const rows = shopifyProducts.flatMap((sp: Record<string, unknown>) => {
      const variants = (sp.variants as Record<string, unknown>[]) ?? []
      const images = (sp.images as Record<string, unknown>[]) ?? []
      const imageUrl = (images[0]?.src as string) ?? null

      return variants.slice(0, 1).map(() => ({
        tenant_id,
        name: sp.title as string,
        category: ((sp.product_type as string) || 'General').slice(0, 50),
        price: parseFloat((variants[0]?.price as string) || '0'),
        description: ((sp.body_html as string) || '')
          .replace(/<[^>]*>/g, '')
          .slice(0, 500),
        image_url: imageUrl,
        shopify_id: String(sp.id),
        source: 'shopify' as const,
        active: true,
      }))
    })

    // Upsert masivo (evita duplicados por shopify_id)
    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert(rows, { onConflict: 'shopify_id' })
      .select('id')

    if (error) {
      console.error('[Shopify import] supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ imported: data?.length ?? rows.length })
  } catch (err) {
    console.error('[POST /api/products/shopify] unexpected error:', err)
    return NextResponse.json({ error: 'Error importando de Shopify' }, { status: 500 })
  }
}
