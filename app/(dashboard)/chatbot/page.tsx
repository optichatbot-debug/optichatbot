'use client'

import { useState } from 'react'
import { OjitoAvatar } from '@/components/chat/OjitoAvatar'
import { ChatWidget } from '@/components/chat/ChatWidget'

export default function ChatbotConfigPage() {
  const [tone, setTone] = useState<'amigable' | 'formal' | 'tecnico'>('amigable')
  const [avatarName, setAvatarName] = useState('Ojito')
  const [primaryColor, setPrimaryColor] = useState('#2563EB')
  const [welcomeMsg, setWelcomeMsg] = useState('¡Hola! Soy tu asistente óptico. ¿En qué puedo ayudarte?')
  const [showPreview, setShowPreview] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    // TODO: guardar en Supabase via API
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">🤖 Configuración del Chatbot</h1>
      <p className="text-gray-500 text-sm mb-8">Personaliza cómo Ojito atiende a tus clientes</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          {/* Avatar name */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Nombre del asistente
            </label>
            <div className="flex items-center gap-3">
              <OjitoAvatar size={40} />
              <input
                type="text"
                value={avatarName}
                onChange={e => setAvatarName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Ej: Ojito, Luna, Visión..."
              />
            </div>
          </div>

          {/* Tone */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tono de conversación
            </label>
            <div className="space-y-2">
              {([
                ['amigable', '😊 Amigable', 'Cercano y cálido, con emojis. Ideal para ópticas retail.'],
                ['formal',   '👔 Formal',   'Profesional y preciso. Ideal para clínicas y consultorios.'],
                ['tecnico',  '🔬 Técnico',  'Terminología óptica. Ideal para laboratorios y B2B.'],
              ] as const).map(([val, label, desc]) => (
                <label
                  key={val}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    tone === val ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    value={val}
                    checked={tone === val}
                    onChange={() => setTone(val)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Color principal del widget
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200"
              />
              <span className="text-sm text-gray-600 font-mono">{primaryColor}</span>
              <div className="flex gap-1.5 ml-2">
                {['#2563EB','#0EA5E9','#7C3AED','#059669','#DC2626','#D97706'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPrimaryColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: primaryColor === c ? '#374151' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Welcome message */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mensaje de bienvenida
            </label>
            <textarea
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              {saved ? '✅ Guardado' : 'Guardar cambios'}
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex-1 border border-blue-200 text-blue-600 py-3 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              {showPreview ? 'Ocultar' : '👁 Vista previa'}
            </button>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="relative h-96 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Vista previa del widget
            </div>
            <ChatWidget
              tenantToken="demo-token-tyler-max-2026"
              avatarName={avatarName}
              businessName="Tu Negocio"
              primaryColor={primaryColor}
              tone={tone}
              apiUrl="/api/chat"
            />
          </div>
        )}
      </div>
    </div>
  )
}
