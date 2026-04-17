'use client'

import { useState } from 'react'

export default function ChannelsPage() {
  const [waToken, setWaToken] = useState('')
  const [waPhoneId, setWaPhoneId] = useState('')
  const [waSaving, setWaSaving] = useState(false)
  const [waSaved, setWaSaved] = useState(false)

  async function saveWhatsApp(e: React.FormEvent) {
    e.preventDefault()
    setWaSaving(true)
    // TODO: guardar en Supabase
    await new Promise(r => setTimeout(r, 800))
    setWaSaved(true)
    setWaSaving(false)
    setTimeout(() => setWaSaved(false), 2000)
  }

  const WEBHOOK_URL = 'https://optichatbot.vercel.app/api/whatsapp'
  const VERIFY_TOKEN = process.env.NEXT_PUBLIC_APP_URL ? 'optichatbot_verify_2026' : 'optichatbot_verify_2026'

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">📱 Canales de Mensajería</h1>
      <p className="text-gray-500 text-sm mb-8">Conecta WhatsApp y Messenger para atender clientes desde esos canales</p>

      {/* WhatsApp — Principal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">📱</div>
          <div>
            <h2 className="font-bold text-gray-900">WhatsApp Business API</h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">⭐ Canal Principal</span>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 rounded-xl p-4 mb-5 text-sm">
          <p className="font-semibold text-blue-800 mb-2">📋 Pasos para conectar WhatsApp:</p>
          <ol className="text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Ve a <a href="https://developers.facebook.com" target="_blank" className="underline font-medium">developers.facebook.com</a></li>
            <li>Crea una App → tipo Business → agrega producto WhatsApp</li>
            <li>En WhatsApp → Configuración, copia tu <b>Phone Number ID</b> y <b>Token</b></li>
            <li>En Webhooks, configura la URL y el Verify Token de abajo</li>
            <li>Activa el campo <b>messages</b> en suscripciones de webhook</li>
          </ol>
        </div>

        {/* Webhook info */}
        <div className="grid grid-cols-1 gap-3 mb-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">URL del Webhook (pega en Meta)</label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 overflow-x-auto">
                {WEBHOOK_URL}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(WEBHOOK_URL)}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Verify Token (pega en Meta)</label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700">
                {VERIFY_TOKEN}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(VERIFY_TOKEN)}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>

        {/* Form credenciales */}
        <form onSubmit={saveWhatsApp} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number ID</label>
            <input value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)}
              placeholder="1234567890123456"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Token de acceso permanente</label>
            <input type="password" value={waToken} onChange={e => setWaToken(e.target.value)}
              placeholder="EAAx..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>
          <button type="submit" disabled={waSaving}
            className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60">
            {waSaved ? '✅ Guardado' : waSaving ? 'Guardando...' : '💾 Guardar configuración WhatsApp'}
          </button>
        </form>
      </div>

      {/* Messenger — Próximamente */}
      <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">💬</div>
          <div>
            <h2 className="font-bold text-gray-400">Facebook Messenger</h2>
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">🔜 Disponible en Fase 2</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-3">
          La integración con Messenger estará disponible en la próxima actualización. La configuración será similar a WhatsApp.
        </p>
      </div>
    </div>
  )
}
