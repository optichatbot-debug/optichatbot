'use client'

import { useEffect, useState, useRef } from 'react'
import { MessageSquare, Smartphone, Globe, Send, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Conversation, ChatMessage } from '@/types'

type Channel = 'all' | 'whatsapp' | 'web'

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
    (c.channel === 'whatsapp'
      ? `+${c.session_id}`
      : `Visitante ${c.session_id.slice(0, 8)}`)
  )
}

function initials(str: string) {
  return str
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function BandejaPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [channel, setChannel] = useState<Channel>('all')
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected])

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

      const res = await fetch(`/api/conversations?tenant_id=${tenant.id}`)
      if (res.ok) {
        const { conversations } = await res.json()
        setConvs(conversations)
      }
      setLoading(false)

      // Supabase Realtime
      const ch = supabase
        .channel('bandeja-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `tenant_id=eq.${tenant.id}`,
          },
          payload => {
            if (payload.eventType === 'INSERT') {
              setConvs(prev => [payload.new as Conversation, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Conversation
              setConvs(prev => prev.map(c => (c.id === updated.id ? updated : c)))
              setSelected(prev => (prev?.id === updated.id ? updated : prev))
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(ch) }
    }
    load()
  }, [])

  async function sendReply() {
    if (!reply.trim() || !selected || !tenantId || sending) return
    setSending(true)

    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        session_id: selected.session_id,
        message: reply.trim(),
      }),
    })

    if (res.ok) setReply('')
    setSending(false)
  }

  const filtered = convs.filter(c => {
    const name = contactName(c).toLowerCase()
    return (
      name.includes(search.toLowerCase()) &&
      (channel === 'all' || c.channel === channel)
    )
  })

  const lastMsg = (c: Conversation) => {
    const msgs = c.messages ?? []
    return msgs[msgs.length - 1]?.content?.slice(0, 45) ?? '…'
  }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* ── Panel izquierdo: lista de chats ── */}
      <div className="w-72 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 mb-3">Bandeja de entrada</h2>

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
            />
          </div>

          <div className="flex gap-1">
            {(['all', 'whatsapp', 'web'] as Channel[]).map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  channel === ch
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {ch === 'all' ? 'Todos' : ch === 'whatsapp' ? 'WA' : 'Web'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-1.5 w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <MessageSquare size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Sin conversaciones</p>
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${
                  selected?.id === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials(contactName(c))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {contactName(c)}
                    </span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-1">
                      {timeAgo(c.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.channel === 'whatsapp' ? (
                      <Smartphone size={10} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Globe size={10} className="text-blue-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-gray-400 truncate">{lastMsg(c)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Panel derecho: conversación ── */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5]">
        {selected ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {initials(contactName(selected))}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{contactName(selected)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selected.channel === 'whatsapp' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Smartphone size={10} /> WhatsApp
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                      <Globe size={10} /> Web
                    </span>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    {selected.messages?.length ?? 0} mensajes
                  </span>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {(selected.messages ?? []).map((msg: ChatMessage & { manual?: boolean }, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                        : 'bg-blue-600 text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === 'user' ? 'text-gray-400' : 'text-blue-200'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {msg.manual && ' · Manual'}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="bg-white border-t border-gray-100 px-6 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                  placeholder="Escribir respuesta manual… (Enter para enviar)"
                  rows={1}
                  className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 max-h-32"
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={48} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Selecciona una conversación</p>
            <p className="text-xs mt-1">para ver el historial y responder</p>
          </div>
        )}
      </div>
    </div>
  )
}
