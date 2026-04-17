'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, Pencil, Upload, Download, X, ToggleLeft, ToggleRight,
  ShoppingBag, Search, Image as ImageIcon, CheckCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

type Category = string

const CATEGORIES = ['General', 'Ópticos', 'Sol', 'Deportivos', 'Infantiles', 'Progresivos', 'Contacto']

interface ProductRow extends Product {
  cost_price?: number
  stock?: number
  video_url?: string
  caracteristicas?: string[]
}

export default function ProductosPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Add modal
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  // Form state
  const [fName, setFName] = useState('')
  const [fCat, setFCat] = useState<Category>('General')
  const [fDesc, setFDesc] = useState('')
  const [fCostPrice, setFCostPrice] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fStock, setFStock] = useState('')
  const [fDisponible, setFDisponible] = useState(true)
  const [fImage, setFImage] = useState('')
  const [fVideo, setFVideo] = useState('')
  const [fCaracteristicas, setFCaracteristicas] = useState<string[]>([])
  const [fCarInput, setFCarInput] = useState('')

  // Excel modal
  const [showExcel, setShowExcel] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const meRes = await fetch('/api/me', { headers: { authorization: `Bearer ${session.access_token}` } })
      if (!meRes.ok) { setLoading(false); return }
      const { tenant } = await meRes.json()
      if (!tenant) { setLoading(false); return }
      setTenantId(tenant.id)
      const res = await fetch(`/api/products?tenant_id=${tenant.id}`)
      if (res.ok) {
        const { products: data } = await res.json()
        setProducts(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  function resetForm() {
    setFName(''); setFCat('General'); setFDesc(''); setFCostPrice('');
    setFPrice(''); setFStock(''); setFDisponible(true); setFImage('');
    setFVideo(''); setFCaracteristicas([]); setFCarInput('')
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || saving) return
    setSaving(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        name: fName, category: fCat, description: fDesc,
        price: parseFloat(fPrice) || 0,
        image_url: fImage || null, sku: null,
        active: fDisponible,
      }),
    })
    if (res.ok) {
      const { product } = await res.json()
      setProducts(prev => [{ ...product, cost_price: parseFloat(fCostPrice) || undefined, stock: parseInt(fStock) || undefined, video_url: fVideo || undefined, caracteristicas: fCaracteristicas }, ...prev])
      setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000)
      resetForm(); setShowModal(false)
    }
    setSaving(false)
  }

  async function toggleActive(p: ProductRow) {
    const res = await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, tenant_id: p.tenant_id, active: !p.active }),
    })
    if (res.ok) {
      const { product } = await res.json()
      setProducts(prev => prev.map(pr => pr.id === product.id ? { ...pr, active: product.active } : pr))
    }
  }

  async function deleteProduct(p: ProductRow) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return
    const res = await fetch(`/api/products?id=${p.id}&tenant_id=${p.tenant_id}`, { method: 'DELETE' })
    if (res.ok) setProducts(prev => prev.filter(pr => pr.id !== p.id))
  }

  function downloadTemplate() {
    const csv = 'Nombre,Categoría,Descripción,Precio,Stock,URL Imagen\n' +
      'Armazón Clásico,Ópticos,Descripción del producto,99.90,10,https://ejemplo.com/img.jpg'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla_productos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault()
    if (!csvFile || !tenantId || importing) return
    setImporting(true); setImportMsg(null)
    const text = await csvFile.text()
    const lines = text.split('\n').slice(1).filter(l => l.trim())
    let count = 0
    for (const line of lines) {
      const parts = line.split(',')
      const [name, category, description, price, , image_url] = parts
      if (!name?.trim() || !price?.trim()) continue
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId, name: name.trim(),
          category: category?.trim() || 'General',
          description: description?.trim() || '',
          price: parseFloat(price.trim()) || 0,
          image_url: image_url?.trim() || null,
        }),
      })
      if (res.ok) {
        const { product } = await res.json()
        setProducts(prev => [product, ...prev])
        count++
      }
    }
    setImportMsg(`✅ ${count} productos importados`)
    setImporting(false)
    if (count > 0) { setCsvFile(null); setTimeout(() => { setShowExcel(false); setImportMsg(null) }, 2000) }
  }

  const filtered = products.filter(p => {
    const nm = (p.name + ' ' + p.category).toLowerCase().includes(search.toLowerCase())
    const cat = catFilter === 'all' || p.category === catFilter
    return nm && cat
  })

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{products.length} productos en tu catálogo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExcel(true)}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload size={15} />
            Importar Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} />
            Agregar producto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setCatFilter('all')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${catFilter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${catFilter === c ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 w-16">Imagen</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Nombre del producto</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Categoría</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Disponibilidad</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Stock</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Precio costo</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Precio</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Promoción</th>
              <th className="px-4 py-3 w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={10} className="px-4 py-4">
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <ShoppingBag size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm">
                    {products.length === 0 ? 'Sin productos. Agrega el primero.' : 'Sin resultados.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon size={14} className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p)} className="group">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        p.active ? 'bg-green-50 text-green-700 group-hover:bg-green-100' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}>
                        {p.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{p.stock ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{p.cost_price ? `S/.${p.cost_price}` : '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">S/.{Number(p.price).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">—</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteProduct(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal agregar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold text-gray-900">Agregar producto</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addProduct} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre *</label>
                  <input required value={fName} onChange={e => setFName(e.target.value)} placeholder="Armazón Clásico" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Categoría</label>
                  <select value={fCat} onChange={e => setFCat(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Disponibilidad</label>
                  <button type="button" onClick={() => setFDisponible(v => !v)} className={`w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${fDisponible ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                    {fDisponible ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {fDisponible ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio costo</label>
                  <input type="number" min="0" step="0.01" value={fCostPrice} onChange={e => setFCostPrice(e.target.value)} placeholder="50.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio de venta *</label>
                  <input required type="number" min="0" step="0.01" value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="99.90" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Stock</label>
                  <input type="number" min="0" value={fStock} onChange={e => setFStock(e.target.value)} placeholder="10" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</label>
                  <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} rows={2} placeholder="Descripción del producto…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">URL Imagen</label>
                  <input value={fImage} onChange={e => setFImage(e.target.value)} placeholder="https://…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">URL Video</label>
                  <input value={fVideo} onChange={e => setFVideo(e.target.value)} placeholder="https://youtube.com/…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Características</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {fCaracteristicas.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {c}
                        <button type="button" onClick={() => setFCaracteristicas(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={fCarInput} onChange={e => setFCarInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && fCarInput.trim()) { e.preventDefault(); setFCaracteristicas(prev => [...prev, fCarInput.trim()]); setFCarInput('') } }}
                    placeholder="Escribe y presiona Enter…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  {savedMsg ? <><CheckCircle size={14} /> Guardado</> : saving ? 'Guardando…' : <><Plus size={14} /> Agregar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal importar Excel */}
      {showExcel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Importar productos</h2>
              <button onClick={() => { setShowExcel(false); setCsvFile(null); setImportMsg(null) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 space-y-1">
                <p className="font-semibold">Instrucciones:</p>
                <p>1. Descarga la plantilla CSV</p>
                <p>2. Rellena los datos de tus productos</p>
                <p>3. Sube el archivo completado</p>
              </div>
              <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                <Download size={15} />
                Descargar plantilla CSV
              </button>
              <form onSubmit={importCsv} className="space-y-3">
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                  {csvFile ? (
                    <p className="text-sm font-medium text-gray-700">{csvFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Clic para seleccionar archivo CSV</p>
                  )}
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
                </div>
                {importMsg && (
                  <div className={`text-sm px-3 py-2 rounded-lg border ${importMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {importMsg}
                  </div>
                )}
                <button type="submit" disabled={!csvFile || importing} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  {importing ? 'Importando…' : 'Importar productos'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
