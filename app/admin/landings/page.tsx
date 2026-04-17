'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Wand2, ExternalLink, Loader2, Globe, Calendar } from 'lucide-react'

interface LandingRow {
  id: string
  tenant_id: string
  name: string
  prompt: string
  html_content: string
  published: boolean
  created_at: string
  tenants?: { name: string; email: string }
}

export default function AdminLandingsPage() {
  const [landings, setLandings] = useState<LandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<LandingRow | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('No autenticado'); setLoading(false); return }

      const res = await fetch('/api/admin/landings', {
        headers: { authorization: `Bearer ${session.access_token}` },
      })
      if (res.status === 403) { setError('Acceso denegado'); setLoading(false); return }
      if (!res.ok) { setError('Error cargando landings'); setLoading(false); return }

      const data = await res.json()
      setLandings(data.landings ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function openPreview(landing: LandingRow) {
    setPreview(landing)
  }

  function openInNewTab(html: string) {
    const blob = new Blob([html], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <p className="text-red-500 font-medium">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="flex items-center gap-3">
          <Wand2 size={22} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin — Landings generadas</h1>
            <p className="text-sm text-gray-500">{landings.length} landings de todos los clientes</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {landings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Wand2 size={48} className="mx-auto mb-3 opacity-20" />
            <p>Aún no hay landings generadas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {landings.map(l => (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Mini preview */}
                <div
                  className="h-40 bg-gray-100 cursor-pointer relative overflow-hidden"
                  onClick={() => openPreview(l)}
                >
                  <iframe
                    srcDoc={l.html_content}
                    className="w-full h-full border-0 pointer-events-none scale-50 origin-top-left"
                    style={{ width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: '0 0' }}
                    sandbox="allow-same-origin"
                    title={l.name}
                  />
                  <div className="absolute inset-0 bg-transparent" />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{l.name || 'Sin nombre'}</p>
                      {l.tenants && (
                        <p className="text-xs text-gray-400 truncate">{l.tenants.name} · {l.tenants.email}</p>
                      )}
                    </div>
                    {l.published && (
                      <span className="flex-shrink-0 flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        <Globe size={10} />
                        Publicada
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{l.prompt}</p>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={11} />
                      {new Date(l.created_at).toLocaleDateString('es-PE')}
                    </span>
                    <button
                      onClick={() => openInNewTab(l.html_content)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ExternalLink size={12} />
                      Ver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-900">{preview.name || 'Landing preview'}</p>
                {preview.tenants && <p className="text-xs text-gray-400">{preview.tenants.name}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openInNewTab(preview.html_content)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={14} />
                  Nueva pestaña
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg px-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe
              srcDoc={preview.html_content}
              className="flex-1 border-0"
              sandbox="allow-same-origin"
              title="preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
