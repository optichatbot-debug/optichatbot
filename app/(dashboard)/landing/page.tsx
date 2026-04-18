'use client'

import { useEffect, useState } from 'react'
import { Wand2, ExternalLink, Save, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [html, setHtml] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const meRes = await fetch('/api/me', {
        headers: { authorization: `Bearer ${session.access_token}` },
      })
      if (!meRes.ok) { setLoading(false); return }
      const { tenant } = await meRes.json()
      setTenantId(tenant?.id ?? null)
      setLoading(false)
    }
    load()
  }, [])

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || generating || !prompt.trim()) return
    setGenerating(true)
    setError(null)
    setHtml(null)
    setSaved(false)

    const res = await fetch('/api/landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, prompt }),
    })

    const data = await res.json()
    if (res.ok) {
      setHtml(data.html)
    } else {
      setError(data.error ?? 'Error generando la landing')
    }
    setGenerating(false)
  }

  async function saveLanding() {
    if (!tenantId || !html || saving) return
    setSaving(true)
    const res = await fetch('/api/landing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, prompt, html_content: html }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  function openInNewTab() {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Landing IA</h1>
            <p className="text-gray-500 text-sm mt-0.5">Genera una landing page completa con inteligencia artificial</p>
          </div>
          {html && (
            <div className="flex items-center gap-2">
              <button onClick={openInNewTab} className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                <ExternalLink size={15} />
                Ver en nueva pestaña
              </button>
              <button onClick={saveLanding} disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                {saved ? <><CheckCircle size={15} />Guardada</> : saving ? <><Loader2 size={15} className="animate-spin" />Guardando…</> : <><Save size={15} />Guardar landing</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — prompt */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 p-6">
          <form onSubmit={generate} className="flex flex-col h-full gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Describe tu landing page
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Quiero una landing para mi óptica con colores azules. Debe tener sección de servicios (examen visual, lentes de contacto, armazones), galería de productos, y formulario de contacto. Estilo moderno y profesional."
                className="w-full h-48 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                required
              />
              <p className="text-xs text-gray-400 mt-2">
                Describe colores, secciones, estilo, nombre del negocio, productos destacados y cualquier información relevante.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={generating || loading || !prompt.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {generating ? (
                <><Loader2 size={16} className="animate-spin" />Generando con IA…</>
              ) : (
                <><Wand2 size={16} />Generar con IA</>
              )}
            </button>

            {html && !generating && (
              <p className="text-xs text-center text-gray-400">
                ✨ Landing generada. Puedes regenerar cambiando la descripción.
              </p>
            )}
          </form>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
          {generating ? (
            <div className="text-center text-gray-400">
              <Loader2 size={40} className="animate-spin mx-auto mb-3 text-blue-400" />
              <p className="text-sm font-medium">Claude está generando tu landing…</p>
              <p className="text-xs mt-1">Esto puede tardar 15-30 segundos</p>
            </div>
          ) : html ? (
            <iframe
              srcDoc={html}
              className="w-full h-full border-0"
              title="Landing preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="text-center text-gray-300 select-none">
              <Wand2 size={52} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-400">Aquí aparecerá el preview</p>
              <p className="text-xs mt-1 text-gray-300">Describe tu landing y haz clic en Generar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
