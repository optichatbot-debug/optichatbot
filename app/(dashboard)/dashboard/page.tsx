'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Users, Smartphone, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Stats {
  conversaciones_hoy: number
  contactos_totales: number
  mensajes_whatsapp: number
  automatizaciones_activas: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    conversaciones_hoy: 0,
    contactos_totales: 0,
    mensajes_whatsapp: 0,
    automatizaciones_activas: 0,
  })
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(true)

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

      setTenantName(tenant.name)

      const statsRes = await fetch(`/api/dashboard/stats?tenant_id=${tenant.id}`)
      if (statsRes.ok) setStats(await statsRes.json())

      setLoading(false)
    }
    load()
  }, [])

  const CARDS = [
    {
      label: 'Conversaciones hoy',
      value: stats.conversaciones_hoy,
      Icon: MessageSquare,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-gray-100',
    },
    {
      label: 'Contactos totales',
      value: stats.contactos_totales,
      Icon: Users,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      border: 'border-gray-100',
    },
    {
      label: 'Mensajes WhatsApp',
      value: stats.mensajes_whatsapp,
      Icon: Smartphone,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      border: 'border-gray-100',
    },
    {
      label: 'Automatizaciones activas',
      value: stats.automatizaciones_activas,
      Icon: Zap,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      border: 'border-gray-100',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Cargando…' : tenantName ? `Hola, ${tenantName} 👋` : 'Dashboard'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de tu actividad</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CARDS.map(({ label, value, Icon, iconBg, iconColor, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-5`}>
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${iconBg}`}>
              <Icon size={18} className={iconColor} />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? '–' : value.toLocaleString('es')}
            </div>
            <div className="text-xs text-gray-500 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            href: '/contactos',
            Icon: Users,
            label: 'Ver contactos',
            desc: 'Todos los que han chateado',
          },
          {
            href: '/automatizacion',
            Icon: Zap,
            label: 'Nueva automatización',
            desc: 'Respuestas por keyword',
          },
          {
            href: '/bandeja',
            Icon: MessageSquare,
            label: 'Bandeja de entrada',
            desc: 'Responder manualmente',
          },
        ].map(({ href, Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="bg-gray-50 group-hover:bg-blue-50 rounded-lg p-2.5 transition-colors flex-shrink-0">
              <Icon size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors text-sm">
                {label}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors mt-0.5 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
