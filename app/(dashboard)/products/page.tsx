'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  category: string
  price: number
  description: string
  source: string
  active: boolean
}

const CATEGORIES = ['Opticos', 'Sol', 'Deportivos', 'Infantiles', 'Accesorios', 'Lunas', 'General']
const DEMO_TENANT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Opticos', price: '', description: '', sku: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'shopify'>('manual')

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?tenant_id=${DEMO_TENANT}`)
      const data = await res.json()
      setProducts(data.products || [])
    } catch { setProducts([]) }
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tenant_id: DEMO_TENANT, price: parseFloat(form.price) }),
      })
      setForm({ name: '', category: 'Opticos', price: '', description: '', sku: '', image_url: '' })
      setShowForm(false)
      fetchProducts()
    } catch {}
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/products?id=${id}&tenant_id=${DEMO_TENANT}`, { method: 'DELETE' })
    fetchProducts()
  }

  const sourceLabel = (s: string) => ({ manual: '✏️ Manual', shopify: '🛍️ Shopify', pdf: '📄 PDF' })[s] || s

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👓 Catálogo de Productos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{products.filter(p => p.active).length} productos activos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Agregar producto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([['manual', '✏️ Manual'], ['shopify', '🛍️ Shopify']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'shopify' && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-orange-800 mb-1">🛍️ Importar desde Shopify</h3>
          <p className="text-orange-700 text-sm mb-4">Conecta tu tienda y el catálogo se sincroniza automáticamente.</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="tu-tienda.myshopify.com"
              className="flex-1 border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
            />
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600">
              Conectar
            </button>
          </div>
        </div>
      )}

      {/* Form agregar */}
      {showForm && (
        <div className="bg-white border border-blue-100 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Nuevo producto</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                required placeholder="Ej: Armazón Óptico Negro"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Categoría *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Precio (S/.) *</label>
              <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                required min="0" step="0.01" placeholder="99.90"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">SKU</label>
              <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})}
                placeholder="LEN-001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={2} placeholder="Describe el producto para que el bot pueda recomendarlo mejor..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar producto'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="text-4xl mb-3">👓</div>
          <p className="text-gray-500 text-sm">No hay productos aún. Agrega tu primer producto.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Precio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Origen</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800">{p.name}</div>
                    {p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{p.category}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-gray-800">S/.{Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-center text-xs">{sourceLabel(p.source)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
