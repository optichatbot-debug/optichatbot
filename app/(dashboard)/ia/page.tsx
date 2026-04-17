'use client'

import { useEffect, useState } from 'react'
import { Save, Eye, EyeOff, Bot, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OjitoAvatar } from '@/components/chat/OjitoAvatar'
import type { Tenant } from '@/types'

type Tone = 'amigable' | 'formal' | 'tecnico'

const TONE_LABELS: Record<Tone, string> = {
  amigable: '😊 Amigable',
  formal: '👔 Formal',
  tecnico: '🔬 Técnico',
}

const TONE_DESC: Record<Tone, string> = {
  amigable: 'Cercano, empático, usa emojis',
  formal: 'Profesional, respetuoso, conciso',
  tecnico: 'Preciso, detallado, específico',
}

export default function IAPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  // Campos editables
  const [avatarName, setAvatarName] = useState('Ojito')
  const [tone, setTone] = useState<Tone>('amigable')
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const [welcomeMsg, setWelcomeMsg] = useState('¡Hola! Soy Ojito 👋 ¿En qué te puedo ayudar hoy?')
  const [businessDesc, setBusinessDesc] = useState('')

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
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    if (!tenant || saving) return
    setSaving(true)

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_name: avatarName,
        tone,
        config: {
          ...tenant.config,
          primary_color: primaryColor,
          welcome_message: welcomeMsg,
          business_description: businessDesc,
        },
      }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const previewMessages = [
    { role: 'assistant', content: welcomeMsg || '¡Hola! ¿En qué te puedo ayudar?' },
    { role: 'user',      content: '¿Qué lentes tienen disponibles?' },
    {
      role: 'assistant',
      content:
        tone === 'amigable'
          ? '¡Con gusto te ayudo! 😊 Tenemos armazones ópticos, lentes de sol y deportivos.'
          : tone === 'formal'
          ? 'Estimado cliente, disponemos de armazones ópticos, lentes de sol y deportivos.'
          : 'Disponemos de: armazones ópticos (esfera, cilindro), lentes de sol (UV400) y deportivos (TR90).',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IA OptiChatBot</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Configura la personalidad y comportamiento de Ojito
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? 'Ocultar' : 'Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Save size={15} />
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Formulario */}
        <div className="flex-1 space-y-5">
          {/* Nombre del bot */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">Identidad del bot</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre del asistente
                </label>
                <input
                  value={avatarName}
                  onChange={e => setAvatarName(e.target.value)}
                  placeholder="Ojito"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descripción del negocio
                </label>
                <textarea
                  value={businessDesc}
                  onChange={e => setBusinessDesc(e.target.value)}
                  placeholder="Ej: Óptica especializada en lentes de moda y lentes con medida, ubicada en Lima…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Esta descripción define el contexto del bot al responder
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mensaje de bienvenida
                </label>
                <textarea
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Tono */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Tono de comunicación</h2>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(TONE_LABELS) as Tone[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    tone === t
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold mb-1 ${tone === t ? 'text-blue-700' : 'text-gray-700'}`}>
                    {TONE_LABELS[t]}
                  </p>
                  <p className="text-xs text-gray-400">{TONE_DESC[t]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">Color del widget</h2>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">{primaryColor}</p>
                <p className="text-xs text-gray-400">Color principal del widget web</p>
              </div>
              <div className="flex gap-2 ml-4">
                {['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden sticky top-4">
              {/* Widget header */}
              <div
                className="px-4 py-3 flex items-center gap-2.5"
                style={{ backgroundColor: primaryColor }}
              >
                <OjitoAvatar size={28} />
                <div>
                  <p className="text-white font-semibold text-sm">{avatarName || 'Ojito'}</p>
                  <p className="text-white/70 text-xs">En línea</p>
                </div>
              </div>

              {/* Preview messages */}
              <div className="p-4 space-y-3 bg-gray-50 min-h-[200px]">
                {previewMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'text-white'
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                      style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview input */}
              <div className="px-3 py-2.5 border-t border-gray-100 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-400">
                  Escribir mensaje…
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
