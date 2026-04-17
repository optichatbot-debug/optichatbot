'use client'

import { useEffect, useState } from 'react'
import { Save, Copy, Check, Globe, Smartphone, Users, CreditCard } from 'lucide-react'
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
