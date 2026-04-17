'use client'

import { useEffect, useState } from 'react'
import { Plus, Zap, Pencil, Trash2, ToggleLeft, ToggleRight, X, Instagram } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Flow } from '@/types'

type Tab = 'mis' | 'basico' | 'secuencias'
type ModalTab = 'whatsapp' | 'instagram'

interface Template {
  id: string
  title: string
  desc: string
  keywords: string[]
}

const WA_TEMPLATES: Template[] = [
  {
    id: 'ai-conv',
    title: 'Automatiza conversaciones con IA',
    desc: 'Deja que la IA responda automáticamente las preguntas frecuentes de tus clientes por WhatsApp.',
    keywords: ['hola', 'info', 'información', 'ayuda'],
  },
  {
    id: 'agenda',
    title: 'Automatiza tu agenda',
    desc: 'Gestiona citas y reservas de forma automática por WhatsApp sin intervención humana.',
    keywords: ['cita', 'agendar', 'reservar', 'agenda'],
  },
  {
    id: 'reservas',
    title: 'Automatiza las reservas de citas',
    desc: 'Permite a tus clientes agendar, modificar o cancelar citas directamente por chat.',
    keywords: ['reserva', 'turno', 'cancelar', 'modificar'],
  },
  {
    id: 'respuestas-ia',
    title: 'Respuestas inteligentes con IA',
    desc: 'Responde preguntas sobre productos, precios y disponibilidad con inteligencia artificial.',
    keywords: ['precio', 'producto', 'disponible', 'cuánto'],
  },
  {
    id: 'redirigir',
    title: 'Redirige a los clientes a tu sitio web',
    desc: 'Dirige automáticamente a los clientes a tu tienda, catálogo o landing page.',
    keywords: ['web', 'tienda', 'catálogo', 'link'],
  },
  {
    id: 'cuestionario',
    title: 'Califica clientes con un cuestionario',
    desc: 'Filtra y califica prospectos con preguntas automáticas antes de hablar con un humano.',
    keywords: ['consulta', 'necesito', 'busco', 'quiero'],
  },
]

const IG_TEMPLATES: Template[] = [
  {
    id: 'ig-dm',
    title: 'Responde DMs automáticamente',
    desc: 'Responde los mensajes directos de Instagram al instante con IA.',
    keywords: ['hola', 'info'],
  },
  {
    id: 'ig-leads',
    title: 'Captura leads de Instagram',
    desc: 'Convierte comentarios y DMs en contactos calificados automáticamente.',
    keywords: ['interesado', 'precio', 'más info'],
  },
  {
    id: 'ig-comments',
    title: 'Responde comentarios con IA',
    desc: 'Responde automáticamente a los comentarios de tus publicaciones.',
    keywords: ['comentario', 'publicación'],
  },
]

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days}d`
}

export default function AutomatizacionPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('mis')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>('whatsapp')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const meRes = await fetch('/api/me', {
        headers: { authorization: `Bearer ${session.access_token}` },
      })
      if (!meRes.ok) { setLoading(false); return }
      const { tenant } = await meRes.json()
      if (!tenant) { setLoading(false); return }

      setTenantId(tenant.id)

      const res = await fetch(`/api/flows?tenant_id=${tenant.id}`)
      if (res.ok) {
        const { flows: data } = await res.json()
        setFlows(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function toggleActive(flow: Flow) {
    const res = await fetch(`/api/flows/${flow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !flow.active }),
    })
    if (res.ok) {
      const { flow: updated } = await res.json()
      setFlows(prev => prev.map(f => (f.id === updated.id ? updated : f)))
    }
  }

  async function deleteFlow(id: string) {
    if (!confirm('¿Eliminar esta automatización?')) return
    const res = await fetch(`/api/flows/${id}`, { method: 'DELETE' })
    if (res.ok) setFlows(prev => prev.filter(f => f.id !== id))
  }

  async function createFromTemplate(template?: Template) {
    if (!tenantId || creating) return
    setCreating(true)
    setShowModal(false)

    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        name: template?.title ?? 'Nuevo flujo',
        trigger_keywords: template?.keywords ?? [],
      }),
    })
    if (res.ok) {
      const { flow } = await res.json()
      window.location.href = `/automatizacion/${flow.id}`
    }
    setCreating(false)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'mis',        label: 'Mis automatizaciones' },
    { id: 'basico',     label: 'Básico'               },
    { id: 'secuencias', label: 'Secuencias'           },
  ]

  const templates = modalTab === 'whatsapp' ? WA_TEMPLATES : IG_TEMPLATES

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatización</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Flujos de respuesta automática por keyword
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          Nueva automatización
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {tab === 'mis' ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Nombre</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Keywords</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Pasos</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Modificado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-6 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : flows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Zap size={36} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400 text-sm font-medium">Sin automatizaciones</p>
                    <p className="text-gray-300 text-xs mt-1">Crea tu primer flujo con el botón de arriba</p>
                  </td>
                </tr>
              ) : (
                flows.map(f => (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/automatizacion/${f.id}`} className="flex items-center gap-2.5 group">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Zap size={14} className="text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {f.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(f.trigger_keywords ?? []).slice(0, 3).map(kw => (
                          <span key={kw} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{kw}</span>
                        ))}
                        {(f.trigger_keywords ?? []).length > 3 && (
                          <span className="text-xs text-gray-400">+{f.trigger_keywords.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => toggleActive(f)} className="group">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                          f.active ? 'bg-green-50 text-green-700 group-hover:bg-green-100' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                        }`}>
                          {f.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                          {f.active ? 'Activo' : 'Pausado'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-500">{(f.steps ?? []).length}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-400">{timeAgo(f.created_at)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link href={`/automatizacion/${f.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil size={14} />
                        </Link>
                        <button onClick={() => deleteFlow(f.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Zap size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm font-medium">Próximamente</p>
        </div>
      )}

      {/* ── Modal nueva automatización ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Nueva automatización</h2>
                <p className="text-gray-400 text-sm">Elige una plantilla o empieza desde cero</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Canal tabs */}
            <div className="flex gap-1 px-6 pt-4">
              {(['whatsapp', 'instagram'] as ModalTab[]).map(ch => (
                <button
                  key={ch}
                  onClick={() => setModalTab(ch)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    modalTab === ch ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ch === 'whatsapp' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  ) : (
                    <Instagram size={14} />
                  )}
                  {ch === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-2 gap-3">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => createFromTemplate(tpl)}
                  disabled={creating}
                  className="text-left p-4 border-2 border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 leading-snug">
                      {tpl.title}
                    </p>
                    <span className="ml-2 flex-shrink-0 bg-blue-100 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      Flow Builder
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{tpl.desc}</p>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">O empieza sin plantilla:</p>
              <button
                onClick={() => createFromTemplate()}
                disabled={creating}
                className="inline-flex items-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              >
                <Plus size={15} />
                {creating ? 'Creando…' : 'Comenzar Desde Cero'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
