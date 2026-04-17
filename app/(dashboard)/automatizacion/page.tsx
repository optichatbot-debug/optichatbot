'use client'

import { useEffect, useState } from 'react'
import { Plus, Zap, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Flow } from '@/types'

type Tab = 'mis' | 'basico' | 'secuencias'

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

  async function createNew() {
    if (!tenantId || creating) return
    setCreating(true)
    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, name: 'Nuevo flujo' }),
    })
    if (res.ok) {
      const { flow } = await res.json()
      window.location.href = `/automatizacion/${flow.id}`
    }
    setCreating(false)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'mis',       label: 'Mis automatizaciones' },
    { id: 'basico',    label: 'Básico'               },
    { id: 'secuencias', label: 'Secuencias'          },
  ]

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
          onClick={createNew}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
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
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">
                  Nombre
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                  Keywords
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                  Estado
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                  Pasos
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                  Modificado
                </th>
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
                    <p className="text-gray-300 text-xs mt-1">
                      Crea tu primer flujo con el botón de arriba
                    </p>
                  </td>
                </tr>
              ) : (
                flows.map(f => (
                  <tr
                    key={f.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Nombre */}
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/automatizacion/${f.id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Zap size={14} className="text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {f.name}
                        </span>
                      </Link>
                    </td>
                    {/* Keywords */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(f.trigger_keywords ?? []).slice(0, 3).map(kw => (
                          <span
                            key={kw}
                            className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                          >
                            {kw}
                          </span>
                        ))}
                        {(f.trigger_keywords ?? []).length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{f.trigger_keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-3.5">
                      <button onClick={() => toggleActive(f)} className="group">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                            f.active
                              ? 'bg-green-50 text-green-700 group-hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}
                        >
                          {f.active ? (
                            <ToggleRight size={12} />
                          ) : (
                            <ToggleLeft size={12} />
                          )}
                          {f.active ? 'Activo' : 'Pausado'}
                        </span>
                      </button>
                    </td>
                    {/* Pasos */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-500">
                        {(f.steps ?? []).length}
                      </span>
                    </td>
                    {/* Modificado */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-400">
                        {timeAgo(f.created_at)}
                      </span>
                    </td>
                    {/* Acciones */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/automatizacion/${f.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => deleteFlow(f.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
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
          <p className="text-gray-300 text-xs mt-1">
            Plantillas de {tab === 'basico' ? 'flujos básicos' : 'secuencias'} disponibles pronto
          </p>
        </div>
      )}
    </div>
  )
}
