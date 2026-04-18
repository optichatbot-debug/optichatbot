'use client'

import { useEffect, useState } from 'react'
import { BarChart2, TrendingUp, ShoppingCart, Loader2, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'

interface TimelineRow {
  fecha: string
  conversaciones: number
  ventas: number
  conversion: number
}

interface TempRow {
  name: string
  value: number
}

interface MetricsData {
  timeline: TimelineRow[]
  temperature: TempRow[]
  totals: { ventas: number; conversion: number }
}

const INTERVAL_OPTIONS = [
  { value: 'diario',   label: 'Diario'   },
  { value: 'semanal',  label: 'Semanal'  },
  { value: 'mensual',  label: 'Mensual'  },
]

function fmt(d: string) {
  return d.slice(5) // MM-DD
}

export default function MetricasPage() {
  const [tenantId, setTenantId]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [data, setData]           = useState<MetricsData | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [from, setFrom]           = useState(thirtyAgo)
  const [to, setTo]               = useState(today)
  const [interval, setInterval]   = useState('diario')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const meRes = await fetch('/api/me', { headers: { authorization: `Bearer ${session.access_token}` } })
      if (!meRes.ok) { setLoading(false); return }
      const { tenant } = await meRes.json()
      if (!tenant) { setLoading(false); return }
      setTenantId(tenant.id)
      await fetchMetrics(tenant.id, from, to)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchMetrics(tid: string, f: string, t: string) {
    const res = await fetch(`/api/metrics?tenant_id=${tid}&from=${f}&to=${t}`)
    if (res.ok) setData(await res.json())
  }

  async function apply() {
    if (!tenantId) return
    setLoading(true)
    await fetchMetrics(tenantId, from, to)
    setLoading(false)
  }

  function clearFilters() {
    setFrom(thirtyAgo)
    setTo(today)
    setInterval('diario')
  }

  const inp = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Analítica de conversaciones y ventas</p>
        </div>
      </div>

      {/* Date filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha inicio</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha fin</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Intervalo</label>
          <select value={interval} onChange={e => setInterval(e.target.value)} className={inp}>
            {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} />
            Limpiar filtros
          </button>
          <button
            onClick={apply}
            disabled={loading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <BarChart2 size={13} />}
            Aplicar período
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-blue-400" />
        </div>
      ) : (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Ventas</p>
                <p className="text-4xl font-bold text-gray-900 mt-0.5">{data?.totals.ventas ?? 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={22} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tasa de Conversión</p>
                <p className="text-4xl font-bold text-gray-900 mt-0.5">{data?.totals.conversion ?? 0}%</p>
              </div>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-2 gap-5">

            {/* Chart 1 — Conversaciones */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Tendencia de conversaciones</h3>
              {(data?.timeline.length ?? 0) === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data?.timeline} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip labelFormatter={l => String(l)} />
                    <Line type="monotone" dataKey="conversaciones" stroke="#3B82F6" strokeWidth={2} dot={false} name="Conversaciones" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart 2 — Ventas */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Tendencia de ventas</h3>
              {(data?.timeline.length ?? 0) === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data?.timeline} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip labelFormatter={l => String(l)} />
                    <Line type="monotone" dataKey="ventas" stroke="#22C55E" strokeWidth={2} dot={false} name="Ventas" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart 3 — Tasa de conversión */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Tendencia de tasa de conversión</h3>
              {(data?.timeline.length ?? 0) === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data?.timeline} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip labelFormatter={l => String(l)} formatter={(v: number) => [v + '%', 'Conversión']} />
                    <Line type="monotone" dataKey="conversion" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Conversión" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart 4 — Temperatura */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Temperatura de conversaciones</h3>
              {(data?.temperature.every(t => t.value === 0)) ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.temperature} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Conversaciones" radius={[4, 4, 0, 0]}
                      fill="#3B82F6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[200px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <p className="text-sm text-gray-400">Sin datos para el período seleccionado</p>
    </div>
  )
}
