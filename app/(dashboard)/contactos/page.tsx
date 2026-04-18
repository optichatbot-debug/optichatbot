'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Smartphone, Globe, X, Instagram, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Contact } from '@/types'

type ChannelFilter = 'all' | 'whatsapp' | 'web' | 'instagram'

const LABELS = ['Sin etiqueta', 'Cliente', 'Prospecto', 'VIP', 'Proveedor', 'Otro']
const CHANNELS = ['whatsapp', 'web', 'instagram', 'messenger'] as const

function initials(str: string) {
  return str.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp:  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  instagram: <Instagram size={11} />,
  web:       <Globe size={11} />,
  messenger: <Smartphone size={11} />,
}

const CHANNEL_STYLE: Record<string, string> = {
  whatsapp:  'bg-green-50 text-green-700',
  instagram: 'bg-pink-50 text-pink-700',
  web:       'bg-blue-50 text-blue-700',
  messenger: 'bg-indigo-50 text-indigo-700',
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fLabel, setFLabel] = useState('Sin etiqueta')
  const [fChannel, setFChannel] = useState<typeof CHANNELS[number]>('whatsapp')

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
      await fetchContacts(tenant.id)
      setLoading(false)
    }
    load()
  }, [])

  async function fetchContacts(tid: string) {
    const res = await fetch(`/api/contacts?tenant_id=${tid}`)
    if (res.ok) {
      const { contacts: data } = await res.json()
      setContacts(data)
    }
  }

  async function createContact(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || saving) return
    setSaving(true)

    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        name: fName,
        phone: fPhone || null,
        email: fEmail || null,
        label: fLabel,
        channel: fChannel,
      }),
    })

    if (res.ok) {
      const { contact } = await res.json()
      setContacts(prev => [contact, ...prev])
      setShowModal(false)
      setFName(''); setFPhone(''); setFEmail(''); setFLabel('Sin etiqueta')
    }
    setSaving(false)
  }

  const filtered = contacts.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
    const channelMatch = channelFilter === 'all' || c.channel === channelFilter
    const labelMatch = labelFilter === 'all' || c.label === labelFilter
    return nameMatch && channelMatch && labelMatch
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona tu base de contactos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-500 text-sm px-3 py-1.5 rounded-full">
            {filtered.length} contactos
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Crear nuevo contacto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        {/* Canal filter */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(['all', 'whatsapp', 'web', 'instagram'] as ChannelFilter[]).map(ch => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                channelFilter === ch ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {ch === 'all' ? 'Todos' : ch.charAt(0).toUpperCase() + ch.slice(1)}
            </button>
          ))}
        </div>

        {/* Label filter */}
        <select
          value={labelFilter}
          onChange={e => setLabelFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-600"
        >
          <option value="all">Todas las etiquetas</option>
          {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Contacto</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Teléfono</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Canal</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Etiqueta</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Estado</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Suscrito</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={7} className="px-6 py-4">
                    <div className="h-6 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-gray-400 text-sm">
                  {contacts.length === 0
                    ? 'Sin contactos aún. Crea el primero con el botón de arriba.'
                    : 'Sin resultados para esta búsqueda.'}
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(c.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-600 font-mono">{c.phone ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${CHANNEL_STYLE[c.channel] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CHANNEL_ICON[c.channel]}
                      {c.channel.charAt(0).toUpperCase() + c.channel.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                      {c.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      c.subscribed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.subscribed ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {c.subscribed ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-400">{formatDate(c.subscribed_at)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/contactos/${c.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-flex">
                      <ExternalLink size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal crear contacto ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Crear nuevo contacto</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createContact} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nombre *
                </label>
                <input
                  required
                  value={fName}
                  onChange={e => setFName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Teléfono WhatsApp
                </label>
                <input
                  value={fPhone}
                  onChange={e => setFPhone(e.target.value)}
                  placeholder="+51 999 999 999"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={fEmail}
                  onChange={e => setFEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Etiqueta
                  </label>
                  <select
                    value={fLabel}
                    onChange={e => setFLabel(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {LABELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Canal
                  </label>
                  <select
                    value={fChannel}
                    onChange={e => setFChannel(e.target.value as typeof CHANNELS[number])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {CHANNELS.map(ch => (
                      <option key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? 'Guardando…' : 'Crear contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
