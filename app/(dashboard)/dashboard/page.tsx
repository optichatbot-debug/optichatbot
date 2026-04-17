'use client'

import { OjitoAvatar } from '@/components/chat/OjitoAvatar'
import { useState } from 'react'

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)

  const snippet = `<script src="https://optichatbot.vercel.app/widget.js" data-token="demo-token-tyler-max-2026"></script>`

  function copySnippet() {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = [
    { label: 'Conversaciones hoy',   value: '24', icon: '💬', color: 'blue'   },
    { label: 'Mensajes WhatsApp',     value: '87', icon: '📱', color: 'green'  },
    { label: 'Productos en catálogo', value: '8',  icon: '👓', color: 'purple' },
    { label: 'Recetas capturadas',    value: '6',  icon: '📋', color: 'orange' },
  ]

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50   text-blue-600   border-blue-100',
    green:  'bg-green-50  text-green-600  border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <OjitoAvatar size={44} animated />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">¡Hola! Tu Ojito está activo 🟢</h1>
          <p className="text-gray-500 text-sm">Tyler & Max Eyewear · Plan Pro</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border p-5 ${colorMap[s.color]}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold mb-1">{s.value}</div>
            <div className="text-xs font-medium opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-1">🔗 Tu snippet de instalación</h2>
        <p className="text-gray-500 text-sm mb-4">
          Pega este código antes de <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> en tu web o tema de Shopify:
        </p>
        <div className="bg-gray-900 rounded-xl p-4 text-sm font-mono text-green-400 overflow-x-auto">
          {snippet}
        </div>
        <button onClick={copySnippet} className="mt-3 text-sm text-blue-600 hover:underline font-medium">
          {copied ? '✅ Copiado' : '📋 Copiar código'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/products', icon: '➕', label: 'Agregar producto',  desc: 'Carga tu catálogo manualmente' },
          { href: '/flows',    icon: '🔀', label: 'Crear flujo',       desc: 'Respuestas automáticas por keyword' },
          { href: '/channels', icon: '📱', label: 'Conectar WhatsApp', desc: 'Configura tu número de negocio' },
        ].map(a => (
          <a key={a.href} href={a.href} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all group">
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{a.label}</div>
            <div className="text-gray-500 text-xs mt-1">{a.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}