'use client'

import { useEffect, useState } from 'react'
import {
  Save, Eye, EyeOff, Bot, Palette,
  Plus, Trash2, Package, ShoppingBag, FileText, Upload, CheckCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OjitoAvatar } from '@/components/chat/OjitoAvatar'
import type { Tenant, Product } from '@/types'

type Tone      = 'amigable' | 'formal' | 'tecnico'
type MainTab   = 'bot' | 'catalogo'
type CatTab    = 'manual' | 'shopify' | 'pdf'

const TONE_LABELS: Record<Tone, string> = {
  amigable: '😊 Amigable',
  formal:   '👔 Formal',
  tecnico:  '🔬 Técnico',
}
const TONE_DESC: Record<Tone, string> = {
  amigable: 'Cercano, empático, usa emojis',
  formal:   'Profesional, respetuoso, conciso',
  tecnico:  'Preciso, detallado, terminología óptica',
}

const CATEGORIES = ['General', 'Opticos', 'Sol', 'Deportivos', 'Infantiles', 'Progresivos', 'Contacto']

export default function IAPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [mainTab, setMainTab] = useState<MainTab>('bot')
  const [catTab, setCatTab] = useState<CatTab>('manual')

  // Bot config
  const [avatarName,   setAvatarName]   = useState('Ojito')
  const [tone,         setTone]         = useState<Tone>('amigable')
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const [welcomeMsg,   setWelcomeMsg]   = useState('¡Hola! Soy Ojito 👋 ¿En qué te puedo ayudar hoy?')
  const [businessDesc, setBusinessDesc] = useState('')

  // Catálogo — Manual
  const [products, setProducts] = useState<Product[]>([])
  const [pName,    setPName]    = useState('')
  const [pCat,     setPCat]    = useState('General')
  const [pPrice,   setPPrice]  = useState('')
  const [pDesc,    setPDesc]   = useState('')
  const [pImage,   setPImage]  = useState('')
  const [pSku,     setPSku]    = useState('')
  const [addingP,  setAddingP] = useState(false)
  const [savedP,   setSavedP]  = useState(false)

  // Shopify
  const [shopUrl,   setShopUrl]   = useState('')
  const [shopToken, setShopToken] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  // PDF
  const [pdfFile,       setPdfFile]       = useState<File | null>(null)
  const [processingPdf, setProcessingPdf] = useState(false)
  const [pdfResult,     setPdfResult]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const meRes = await fetch('/api/me', {
        headers: { authorization: `Bearer ${session.access_token}` },
      })
      if (!meRes.ok) { setLoading(false); return }
      const { tenant: t } = await meRes.json()
      if (!t) { setLoading(false); return }

      setTenant(t)
      setAvatarName(t.avatar_name ?? 'Ojito')
      setTone(t.tone ?? 'amigable')
      setPrimaryColor(t.config?.primary_color ?? '#2563EB')
      setWelcomeMsg(t.config?.welcome_message ?? '¡Hola! Soy Ojito 👋 ¿En qué te puedo ayudar hoy?')
      setBusinessDesc(t.config?.business_description ?? '')

      const prodRes = await fetch(`/api/products?tenant_id=${t.id}`)
      if (prodRes.ok) {
        const { products: data } = await prodRes.json()
        setProducts(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveBotConfig() {
    if (!tenant || saving) return
    setSaving(true)
    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_name: avatarName,
        tone,
        config: { ...tenant.config, primary_color: primaryColor, welcome_message: welcomeMsg, business_description: businessDesc },
      }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant || addingP) return
    setAddingP(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        name: pName, category: pCat, price: pPrice,
        description: pDesc, image_url: pImage || null, sku: pSku || null,
      }),
    })
    if (res.ok) {
      const { product } = await res.json()
      setProducts(prev => [product, ...prev])
      setPName(''); setPCat('General'); setPPrice(''); setPDesc(''); setPImage(''); setPSku('')
      setSavedP(true); setTimeout(() => setSavedP(false), 2000)
    }
    setAddingP(false)
  }

  async function deleteProduct(id: string) {
    if (!tenant) return
    const res = await fetch(`/api/products?id=${id}&tenant_id=${tenant.id}`, { method: 'DELETE' })
    if (res.ok) setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function importShopify(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant || importing) return
    setImporting(true)
    setImportResult(null)
    const res = await fetch('/api/products/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenant.id, shop_url: shopUrl, access_token: shopToken }),
    })
    const data = await res.json()
    if (res.ok) {
      setImportResult(`✅ ${data.imported} productos importados correctamente`)
      const prodRes = await fetch(`/api/products?tenant_id=${tenant.id}`)
      if (prodRes.ok) { const { products: d } = await prodRes.json(); setProducts(d) }
    } else {
      setImportResult(`❌ ${data.error}`)
    }
    setImporting(false)
  }

  async function processPdf(e: React.FormEvent) {
    e.preventDefault()
    if (!tenant || !pdfFile || processingPdf) return
    setProcessingPdf(true)
    setPdfResult(null)

    const formData = new FormData()
    formData.append('file', pdfFile)
    formData.append('tenant_id', tenant.id)

    const res = await fetch('/api/products/pdf', { method: 'POST', body: formData })
    const data = await res.json()
    if (res.ok) {
      setPdfResult(`✅ ${data.imported} productos extraídos del PDF`)
      const prodRes = await fetch(`/api/products?tenant_id=${tenant.id}`)
      if (prodRes.ok) { const { products: d } = await prodRes.json(); setProducts(d) }
    } else {
      setPdfResult(`❌ ${data.error}`)
    }
    setProcessingPdf(false)
  }

  const previewMessages = [
    { role: 'assistant', content: welcomeMsg || '¡Hola! ¿En qué te puedo ayudar?' },
    { role: 'user',      content: '¿Qué lentes tienen?' },
    {
      role: 'assistant',
      content: tone === 'amigable'
        ? '¡Con gusto! 😊 Tenemos armazones, lentes de sol y deportivos desde S/.69.'
        : tone === 'formal'
        ? 'Disponemos de armazones ópticos, lentes de sol y deportivos. ¿En qué categoría está interesado?'
        : 'Línea disponible: armazones ópticos (Esf/Cil/Eje), sol (UV400) y deportivos (TR90). ¿Requiere Rx?',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IA OptiChatBot</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configura Ojito y carga tu catálogo</p>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === 'bot' && (
            <>
              <button onClick={() => setShowPreview(p => !p)} className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                {showPreview ? 'Ocultar' : 'Preview'}
              </button>
              <button onClick={saveBotConfig} disabled={saving || loading} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                <Save size={15} />
                {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { id: 'bot' as MainTab, label: '🤖 Configuración del bot' },
          { id: 'catalogo' as MainTab, label: `📦 Catálogo (${products.length} productos)` },
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mainTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BOT CONFIG ── */}
      {mainTab === 'bot' && (
        <div className="flex gap-6">
          <div className="flex-1 space-y-5">
            {/* Identidad */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4"><Bot size={16} className="text-blue-500" /><h2 className="font-semibold text-gray-900">Identidad del bot</h2></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del asistente</label>
                  <input value={avatarName} onChange={e => setAvatarName(e.target.value)} placeholder="Ojito" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción del negocio</label>
                  <textarea value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} placeholder="Ej: Óptica especializada en lentes de moda…" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje de bienvenida</label>
                  <textarea value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                </div>
              </div>
            </div>

            {/* Tono */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Tono de comunicación</h2>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(TONE_LABELS) as Tone[]).map(t => (
                  <button key={t} onClick={() => setTone(t)} className={`p-4 rounded-xl border-2 text-left transition-all ${tone === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className={`text-sm font-semibold mb-1 ${tone === t ? 'text-blue-700' : 'text-gray-700'}`}>{TONE_LABELS[t]}</p>
                    <p className="text-xs text-gray-400">{TONE_DESC[t]}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4"><Palette size={16} className="text-blue-500" /><h2 className="font-semibold text-gray-900">Color del widget</h2></div>
              <div className="flex items-center gap-4">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <div><p className="text-sm font-medium text-gray-700">{primaryColor}</p><p className="text-xs text-gray-400">Color principal</p></div>
                <div className="flex gap-2 ml-2">
                  {['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'].map(c => (
                    <button key={c} onClick={() => setPrimaryColor(c)} style={{ backgroundColor: c }} className={`w-7 h-7 rounded-full border-2 transition-all ${primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden sticky top-4">
                <div className="px-4 py-3 flex items-center gap-2.5" style={{ backgroundColor: primaryColor }}>
                  <OjitoAvatar size={28} />
                  <div><p className="text-white font-semibold text-sm">{avatarName || 'Ojito'}</p><p className="text-white/70 text-xs">En línea</p></div>
                </div>
                <div className="p-4 space-y-3 bg-gray-50 min-h-[200px]">
                  {previewMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'text-white' : 'bg-white border border-gray-200 text-gray-700'}`} style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2.5 border-t border-gray-100 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-400">Escribir mensaje…</div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" /></svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CATÁLOGO ── */}
      {mainTab === 'catalogo' && (
        <div>
          {/* Cat tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
            {[
              { id: 'manual'  as CatTab, Icon: Package,     label: 'Manual'  },
              { id: 'shopify' as CatTab, Icon: ShoppingBag, label: 'Shopify' },
              { id: 'pdf'     as CatTab, Icon: FileText,    label: 'PDF'     },
            ].map(({ id, Icon, label }) => (
              <button key={id} onClick={() => setCatTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${catTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {/* Manual */}
          {catTab === 'manual' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Agregar producto</h3>
                <form onSubmit={addProduct} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre *</label>
                      <input required value={pName} onChange={e => setPName(e.target.value)} placeholder="Armazón Óptico Clásico" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Categoría</label>
                      <select value={pCat} onChange={e => setPCat(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio (S/.) *</label>
                      <input required type="number" min="0" step="0.01" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="99.90" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</label>
                      <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} rows={2} placeholder="Características, material, uso recomendado…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">URL imagen</label>
                      <input value={pImage} onChange={e => setPImage(e.target.value)} placeholder="https://…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">SKU</label>
                      <input value={pSku} onChange={e => setPSku(e.target.value)} placeholder="ARZ-001" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                  <button type="submit" disabled={addingP} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    {savedP ? <><CheckCircle size={15} /> Producto agregado</> : addingP ? 'Guardando…' : <><Plus size={15} /> Agregar producto</>}
                  </button>
                </form>
              </div>

              {/* Product list */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Productos cargados</h3>
                  <span className="text-xs text-gray-400">{products.length} productos</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                  {products.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      <Package size={28} className="mx-auto mb-2 opacity-30" />
                      Sin productos cargados
                    </div>
                  ) : (
                    products.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category} · S/.{p.price}</p>
                        </div>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shopify */}
          {catTab === 'shopify' && (
            <div className="max-w-lg">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag size={18} className="text-green-600" />
                  <h3 className="font-semibold text-gray-900">Importar desde Shopify</h3>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                  Ingresa tu tienda Shopify y un token de acceso con permisos de lectura de productos.
                </p>
                <form onSubmit={importShopify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">URL de la tienda Shopify</label>
                    <input required value={shopUrl} onChange={e => setShopUrl(e.target.value)} placeholder="mitienda.myshopify.com" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Access Token (Admin API)</label>
                    <input required type="password" value={shopToken} onChange={e => setShopToken(e.target.value)} placeholder="shpat_…" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    <p className="text-xs text-gray-400 mt-1">En Shopify Admin → Apps → Develop apps → Crear app → Permiso: read_products</p>
                  </div>
                  <button type="submit" disabled={importing} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    <ShoppingBag size={15} />
                    {importing ? 'Importando…' : 'Importar productos'}
                  </button>
                  {importResult && (
                    <div className={`text-sm px-3 py-2.5 rounded-lg border ${importResult.startsWith('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {importResult}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* PDF */}
          {catTab === 'pdf' && (
            <div className="max-w-lg">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={18} className="text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Importar desde PDF</h3>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                  Sube tu catálogo en PDF. La IA extraerá los productos automáticamente.
                </p>
                <form onSubmit={processPdf} className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('pdf-input')?.click()}
                  >
                    <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                    {pdfFile ? (
                      <p className="text-sm font-medium text-gray-700">{pdfFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-400">Arrastra tu PDF aquí o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-300 mt-1">Máximo 10MB</p>
                      </>
                    )}
                    <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <button type="submit" disabled={!pdfFile || processingPdf} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    <FileText size={15} />
                    {processingPdf ? 'Procesando con IA…' : 'Procesar catálogo PDF'}
                  </button>
                  {pdfResult && (
                    <div className={`text-sm px-3 py-2.5 rounded-lg border ${pdfResult.startsWith('✅') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {pdfResult}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
