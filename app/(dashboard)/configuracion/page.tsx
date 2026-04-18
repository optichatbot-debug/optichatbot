'use client'

import { useEffect, useState } from 'react'
import { Save, Copy, Check, Globe, Smartphone, Users, CreditCard, Link2, X, Instagram, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/types'

type Section = 'general' | 'canales' | 'miembros' | 'facturacion'

export default function ConfiguracionPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [section, setSection] = useState<Section>('general')
  const [copied, setCopied] = useState(false)
  const [vincularOpen, setVincularOpen] = useState(false)
  const [vincularChannel, setVincularChannel] = useState<'whatsapp' | 'instagram' | 'messenger' | null>(null)

  // General
  const [bizName, setBizName] = useState('')
  const [timezone, setTimezone] = useState('America/Lima')

  // WhatsApp
  const [waPhone, setWaPhone] = useState('')
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waToken, setWaToken] = useState('')

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
      setBizName(t.name ?? '')
      setWaPhone(t.wa_phone_number ?? '')
      setWaPhoneId((t as Record<string, unknown>).wa_phone_number_id as string ?? '')
      setWaToken(t.wa_token ?? '')
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    if (!tenant || saving) return
    setSaving(true)

    const body: Record<string, unknown> = {}
    if (section === 'general') {
      body.name = bizName
    } else if (section === 'canales') {
      body.wa_phone_number = waPhone
      body.wa_phone_number_id = waPhoneId
      body.wa_token = waToken
    }

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const webhookUrl = tenant
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://optichatbot.vercel.app'}/api/whatsapp`
    : ''

  const widgetSnippet = tenant
    ? `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://optichatbot.vercel.app'}/widget.js" data-token="${tenant.widget_token}"></script>`
    : ''

  const SECTIONS: { id: Section; label: string; Icon: React.ElementType }[] = [
    { id: 'general',     label: 'General',          Icon: Globe       },
    { id: 'canales',     label: 'Canales',           Icon: Smartphone  },
    { id: 'miembros',    label: 'Miembros',          Icon: Users       },
    { id: 'facturacion', label: 'Facturación',       Icon: CreditCard  },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-0.5">Administra tu cuenta y canales</p>
        </div>
        {(section === 'general' || section === 'canales') && (
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Save size={15} />
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar de secciones */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                  section === id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} className={section === id ? 'text-blue-500' : 'text-gray-400'} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido */}
        <div className="flex-1 max-w-2xl">

          {/* ── General ── */}
          {section === 'general' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 mb-2">Información general</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre del negocio
                </label>
                <input
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Zona horaria
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="America/Lima">América/Lima (UTC-5)</option>
                  <option value="America/Bogota">América/Bogotá (UTC-5)</option>
                  <option value="America/Mexico_City">América/Ciudad de México (UTC-6)</option>
                  <option value="America/Argentina/Buenos_Aires">América/Buenos Aires (UTC-3)</option>
                  <option value="America/Santiago">América/Santiago (UTC-4)</option>
                  <option value="America/Caracas">América/Caracas (UTC-4)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email de la cuenta
                </label>
                <input
                  value={tenant?.email ?? ''}
                  disabled
                  className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* ── Canales ── */}
          {section === 'canales' && (
            <div className="space-y-5">

              {/* VINCULAR button */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">Vincular canal</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Conecta tus canales de mensajería</p>
                  </div>
                  <button
                    onClick={() => setVincularOpen(v => !v)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Link2 size={14} />
                    VINCULAR
                  </button>
                </div>

                {vincularOpen && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                    {/* WhatsApp */}
                    <div
                      onClick={() => setVincularChannel(c => c === 'whatsapp' ? null : 'whatsapp')}
                      className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${vincularChannel === 'whatsapp' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16A34A"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </div>
                      <p className="text-xs font-semibold text-gray-800">WhatsApp</p>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Incluido</span>
                    </div>

                    {/* Instagram */}
                    <div
                      onClick={() => setVincularChannel(c => c === 'instagram' ? null : 'instagram')}
                      className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${vincularChannel === 'instagram' ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-2">
                        <Instagram size={20} className="text-pink-600" />
                      </div>
                      <p className="text-xs font-semibold text-gray-800">Instagram</p>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Premium</span>
                    </div>

                    {/* Messenger */}
                    <div
                      onClick={() => setVincularChannel(c => c === 'messenger' ? null : 'messenger')}
                      className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all ${vincularChannel === 'messenger' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-2">
                        <MessageCircle size={20} className="text-indigo-600" />
                      </div>
                      <p className="text-xs font-semibold text-gray-800">Messenger</p>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Premium</span>
                    </div>
                  </div>
                )}

                {/* Channel detail */}
                {vincularOpen && vincularChannel === 'whatsapp' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-semibold text-green-800 mb-3">Conectar WhatsApp Business</p>
                    <p className="text-xs text-green-700 mb-3">Inicia sesión con Facebook Business Manager para vincular tu número de WhatsApp.</p>
                    <button
                      onClick={() => {
                        const redirectUri = encodeURIComponent(window.location.origin + '/api/whatsapp/callback')
                        window.open('https://www.facebook.com/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=' + redirectUri + '&scope=whatsapp_business_management,whatsapp_business_messaging', '_blank')
                      }}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Conectar WhatsApp
                    </button>
                  </div>
                )}
                {vincularOpen && (vincularChannel === 'instagram' || vincularChannel === 'messenger') && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Disponible en plan Premium</p>
                      <p className="text-xs text-amber-600 mt-0.5">Actualiza tu plan para vincular {vincularChannel === 'instagram' ? 'Instagram' : 'Messenger'}.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <Smartphone size={14} className="text-green-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900">WhatsApp Business API</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Número de teléfono
                    </label>
                    <input
                      value={waPhone}
                      onChange={e => setWaPhone(e.target.value)}
                      placeholder="+51999999999"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number ID (Meta)
                    </label>
                    <input
                      value={waPhoneId}
                      onChange={e => setWaPhoneId(e.target.value)}
                      placeholder="123456789"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Access Token
                    </label>
                    <input
                      type="password"
                      value={waToken}
                      onChange={e => setWaToken(e.target.value)}
                      placeholder="EAA…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">
                      URL del Webhook (configurar en Meta)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-700 bg-white border border-gray-200 rounded px-2.5 py-1.5 font-mono truncate">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={() => copy(webhookUrl)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Verify Token: <code className="font-mono text-gray-600">optichatbot-webhook</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Widget web */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Globe size={14} className="text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900">Widget Web</h2>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  Pega este snippet antes de <code className="bg-gray-100 px-1 rounded text-xs">&lt;/body&gt;</code> en tu sitio web o Shopify:
                </p>
                <div className="bg-gray-900 rounded-xl px-4 py-3 text-xs font-mono text-green-400 overflow-x-auto mb-3">
                  {widgetSnippet || 'Cargando…'}
                </div>
                <button
                  onClick={() => copy(widgetSnippet)}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copiado' : 'Copiar snippet'}
                </button>
              </div>
            </div>
          )}

          {/* ── Miembros ── */}
          {section === 'miembros' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Miembros del equipo</h2>
              <p className="text-gray-400 text-sm">
                La gestión de múltiples miembros estará disponible próximamente.
              </p>
              <div className="mt-6 flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {(tenant?.name ?? 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tenant?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{tenant?.email ?? '—'} · Admin</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Facturación ── */}
          {section === 'facturacion' && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Facturación</h2>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Plan actual: <span className="capitalize">{tenant?.plan ?? 'free'}</span>
                  </p>
                  <p className="text-xs text-blue-500">
                    Widget + WhatsApp + IA incluidos
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                La gestión de planes y pagos estará disponible próximamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
