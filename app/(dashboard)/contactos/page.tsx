'use client'

import { useEffect, useState } from 'react'
import { Search, Smartphone, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Conversation } from '@/types'

type Channel = 'all' | 'whatsapp' | 'web'

function initials(str: string) {
  return str
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function contactName(c: Conversation) {
  return (
    (c.metadata as Record<string, string>)?.contact_name ||
    (c.channel === 'whatsapp' ? `+${c.session_id}` : `Visitante ${c.session_id.slice(0, 8)}`)
  )
}

function lastMsg(c: Conversation) {
  const msgs = c.messages ?? []
  return msgs[msgs.length - 1]?.content?.slice(0, 55) ?? '…'
}

function isRecent(d: string) {
  return Date.now() - new Date(d).getTime() < 24 * 3_600_000
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<Channel>('all')

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

      const res = await fetch(`/api/conversations?tenant_id=${tenant.id}`)
      if (res.ok) {
        const { conversations } = await res.json()
        setContacts(conversations)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = contacts.filter(c => {
    const name = contactName(c).toLowerCase()
    return (
      name.includes(search.toLowerCase()) &&
      (channel === 'all' || c.channel === channel)
    )
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Personas que han chateado con tu bot
          </p>
        </div>
        <span className="bg-gray-100 text-gray-600 text-sm font-medium px-3 py-1.5 rounded-full">
          {filtered.length} contactos
        </span>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o número…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(['all', 'whatsapp', 'web'] as Channel[]).map(ch => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                channel === ch
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {ch === 'all' ? 'Todos' : ch === 'whatsapp' ? 'WhatsApp' : 'Web'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">
                Contacto
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                Canal
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                Último mensaje
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                Visto
              </th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">
                  {contacts.length === 0
                    ? 'Aún no hay contactos. Aparecerán aquí cuando alguien chatée con tu bot.'
                    : 'Sin resultados para tu búsqueda.'}
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                >
                  {/* Contacto */}
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(contactName(c))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {contactName(c)}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {c.session_id.slice(0, 20)}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Canal */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        c.channel === 'whatsapp'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {c.channel === 'whatsapp' ? (
                        <Smartphone size={11} />
                      ) : (
                        <Globe size={11} />
                      )}
                      {c.channel === 'whatsapp' ? 'WhatsApp' : 'Web'}
                    </span>
                  </td>
                  {/* Último mensaje */}
                  <td className="px-4 py-3.5 max-w-[220px]">
                    <span className="text-sm text-gray-500 truncate block">
                      {lastMsg(c)}
                    </span>
                  </td>
                  {/* Tiempo */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-400">{timeAgo(c.updated_at)}</span>
                  </td>
                  {/* Estado */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        isRecent(c.updated_at)
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isRecent(c.updated_at) ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {isRecent(c.updated_at) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
