'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Plus, Loader2, X, CheckCircle, Calendar,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactDetail {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  label: string
  channel: string
  subscribed: boolean
  notes?: string
  metadata: Record<string, unknown>
  subscribed_at: string
  created_at: string
  updated_at: string
  dni?: string
  ciudad?: string
  direccion?: string
}

interface EyeRow {
  esferico: string
  cilindro: string
  eje: string
  av_cc: string
  dip: string
  altura: string
  adicion: string
}

const EMPTY_EYE_ROW: EyeRow = {
  esferico: '', cilindro: '', eje: '', av_cc: '', dip: '', altura: '', adicion: '',
}

interface PrescriptionData {
  doctor: string
  fecha: string
  tipo: string
  lejos_od: EyeRow
  lejos_oi: EyeRow
  cerca_od: EyeRow
  cerca_oi: EyeRow
  intermedia_od: EyeRow
  intermedia_oi: EyeRow
  razon_consulta: string
  sintomatologia: string
  diagnostico: string
  tratamiento: string
  historia_ocular: string
  historial_familiar: string
  comentarios: string
}

interface Appointment {
  id: string
  fecha: string
  hora: string
  tipo: string
  doctor: string
  notas: string
  status: string
}

type Tab = 'datos' | 'historia' | 'compras' | 'citas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(str: string) {
  return str.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

const EYE_COLS = ['Esférico', 'Cilindro', 'Eje', 'AV C/c', 'DIP', 'Altura', 'Adición']
const EYE_KEYS: (keyof EyeRow)[] = ['esferico', 'cilindro', 'eje', 'av_cc', 'dip', 'altura', 'adicion']

// ─── Sub-components ───────────────────────────────────────────────────────────

function EyeTable({
  title,
  od,
  oi,
  onChange,
}: {
  title: string
  od: EyeRow
  oi: EyeRow
  onChange: (eye: 'od' | 'oi', key: keyof EyeRow, val: string) => void
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 w-10"></th>
              {EYE_COLS.map(col => (
                <th key={col} className="px-3 py-2 text-center font-semibold text-gray-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['od', 'oi'] as const).map(eye => {
              const row = eye === 'od' ? od : oi
              return (
                <tr key={eye} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-bold text-gray-700 uppercase">{eye}</td>
                  {EYE_KEYS.map(k => (
                    <td key={k} className="px-1 py-1">
                      <input
                        value={row[k]}
                        onChange={e => onChange(eye, k, e.target.value)}
                        className="w-full text-center border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('datos')

  // ── Tab Datos state ──
  const [fFirstName, setFFirstName] = useState('')
  const [fLastName, setFLastName] = useState('')
  const [fDni, setFDni] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fCiudad, setFCiudad] = useState('')
  const [fDireccion, setFDireccion] = useState('')
  const [savingDatos, setSavingDatos] = useState(false)
  const [savedDatos, setSavedDatos] = useState(false)

  // ── Tab Historia state ──
  const [rx, setRx] = useState<PrescriptionData>({
    doctor: '', fecha: '', tipo: 'Lejos',
    lejos_od: { ...EMPTY_EYE_ROW }, lejos_oi: { ...EMPTY_EYE_ROW },
    cerca_od: { ...EMPTY_EYE_ROW }, cerca_oi: { ...EMPTY_EYE_ROW },
    intermedia_od: { ...EMPTY_EYE_ROW }, intermedia_oi: { ...EMPTY_EYE_ROW },
    razon_consulta: '', sintomatologia: '', diagnostico: '',
    tratamiento: '', historia_ocular: '', historial_familiar: '', comentarios: '',
  })
  const [savingRx, setSavingRx] = useState(false)
  const [savedRx, setSavedRx] = useState(false)

  // ── Tab Citas state ──
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppts, setLoadingAppts] = useState(false)
  const [showApptModal, setShowApptModal] = useState(false)
  const [savingAppt, setSavingAppt] = useState(false)
  const [apptFecha, setApptFecha] = useState('')
  const [apptHora, setApptHora] = useState('')
  const [apptTipo, setApptTipo] = useState('Examen visual')
  const [apptDoctor, setApptDoctor] = useState('')
  const [apptNotas, setApptNotas] = useState('')

  // ─── Load ──────────────────────────────────────────────────────────────────

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

      const cRes = await fetch(`/api/contacts/${id}`)
      if (cRes.ok) {
        const { contact: c } = await cRes.json()
        setContact(c)
        const parts = (c.name ?? '').split(' ')
        setFFirstName(parts[0] ?? '')
        setFLastName(parts.slice(1).join(' '))
        setFDni(c.dni ?? '')
        setFPhone(c.phone ?? '')
        setFEmail(c.email ?? '')
        setFCiudad(c.ciudad ?? '')
        setFDireccion(c.direccion ?? '')
      }

      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (activeTab === 'citas' && tenantId) {
      fetchAppointments()
    }
  }, [activeTab, tenantId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAppointments() {
    if (!tenantId) return
    setLoadingAppts(true)
    const res = await fetch(`/api/contact-appointments?contact_id=${id}&tenant_id=${tenantId}`)
    if (res.ok) {
      const { appointments: data } = await res.json()
      setAppointments(data ?? [])
    }
    setLoadingAppts(false)
  }

  // ─── Save Datos ────────────────────────────────────────────────────────────

  async function saveDatos(e: React.FormEvent) {
    e.preventDefault()
    if (!contact || savingDatos) return
    setSavingDatos(true)
    const name = [fFirstName, fLastName].filter(Boolean).join(' ')
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone: fPhone || null, email: fEmail || null, dni: fDni || null, ciudad: fCiudad || null, direccion: fDireccion || null }),
    })
    if (res.ok) {
      const { contact: updated } = await res.json()
      setContact(updated)
      setSavedDatos(true)
      setTimeout(() => setSavedDatos(false), 2500)
    }
    setSavingDatos(false)
  }

  // ─── Save Historia ─────────────────────────────────────────────────────────

  async function saveHistoria(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || savingRx) return
    setSavingRx(true)
    const res = await fetch('/api/contact-prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: id, tenant_id: tenantId, ...rx }),
    })
    if (res.ok) {
      setSavedRx(true)
      setTimeout(() => setSavedRx(false), 2500)
    }
    setSavingRx(false)
  }

  // ─── Save Cita ─────────────────────────────────────────────────────────────

  async function saveAppointment(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || savingAppt) return
    setSavingAppt(true)
    const res = await fetch('/api/contact-appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: id,
        tenant_id: tenantId,
        fecha: apptFecha,
        hora: apptHora,
        tipo: apptTipo,
        doctor: apptDoctor,
        notas: apptNotas,
        status: 'pendiente',
      }),
    })
    if (res.ok) {
      const { appointment } = await res.json()
      setAppointments(prev => [...prev, appointment])
      setShowApptModal(false)
      setApptFecha(''); setApptHora(''); setApptTipo('Examen visual')
      setApptDoctor(''); setApptNotas('')
    }
    setSavingAppt(false)
  }

  // ─── Update eye row helper ─────────────────────────────────────────────────

  function updateEye(
    section: 'lejos' | 'cerca' | 'intermedia',
    eye: 'od' | 'oi',
    key: keyof EyeRow,
    val: string
  ) {
    const field = `${section}_${eye}` as keyof PrescriptionData
    setRx(prev => ({
      ...prev,
      [field]: { ...(prev[field] as EyeRow), [key]: val },
    }))
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-8 text-center text-gray-500">
        Contacto no encontrado.{' '}
        <button onClick={() => router.push('/contactos')} className="text-blue-600 underline">
          Volver
        </button>
      </div>
    )
  }

  const displayName = contact.name || '—'
  const tabs: { key: Tab; label: string }[] = [
    { key: 'datos', label: 'Datos' },
    { key: 'historia', label: 'Historia' },
    { key: 'compras', label: 'Compras' },
    { key: 'citas', label: 'Citas' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/contactos')}
          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {initials(displayName)}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-gray-500">
            {contact.dni && <span>DNI/RUC: <span className="font-medium text-gray-700">{contact.dni}</span></span>}
            {contact.phone && <span>Tel: <span className="font-medium text-gray-700">{contact.phone}</span></span>}
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              Total compras: S/. 0
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: DATOS ══════════════════ */}
      {activeTab === 'datos' && (
        <form onSubmit={saveDatos} className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-5">Información del contacto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombres</label>
              <input
                value={fFirstName}
                onChange={e => setFFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Nombres"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Apellidos</label>
              <input
                value={fLastName}
                onChange={e => setFLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Apellidos"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">DNI / RUC</label>
              <input
                value={fDni}
                onChange={e => setFDni(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Teléfono</label>
              <input
                value={fPhone}
                onChange={e => setFPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="+51 999 999 999"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={fEmail}
                onChange={e => setFEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ciudad</label>
              <input
                value={fCiudad}
                onChange={e => setFCiudad(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Lima"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Dirección</label>
              <input
                value={fDireccion}
                onChange={e => setFDireccion(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Av. Ejemplo 123, Miraflores"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={savingDatos}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {savingDatos ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar cambios
            </button>
            {savedDatos && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle size={14} /> Guardado
              </span>
            )}
          </div>
        </form>
      )}

      {/* ══════════════════ TAB: HISTORIA ══════════════════ */}
      {activeTab === 'historia' && (
        <form onSubmit={saveHistoria} className="space-y-6">
          {/* Cabecera receta */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-5">Datos de la consulta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Doctor / Optometra</label>
                <input
                  value={rx.doctor}
                  onChange={e => setRx(p => ({ ...p, doctor: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Dr. García"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={rx.fecha}
                  onChange={e => setRx(p => ({ ...p, fecha: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo prescripción</label>
                <select
                  value={rx.tipo}
                  onChange={e => setRx(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {['Lejos', 'Cerca', 'Multifocal', 'Bifocal', 'Progresivo'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tablas de visión */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-5">Prescripción óptica</h2>
            <EyeTable
              title="Visión de Lejos"
              od={rx.lejos_od}
              oi={rx.lejos_oi}
              onChange={(eye, key, val) => updateEye('lejos', eye, key, val)}
            />
            <EyeTable
              title="Visión de Cerca"
              od={rx.cerca_od}
              oi={rx.cerca_oi}
              onChange={(eye, key, val) => updateEye('cerca', eye, key, val)}
            />
            <EyeTable
              title="Visión Intermedia"
              od={rx.intermedia_od}
              oi={rx.intermedia_oi}
              onChange={(eye, key, val) => updateEye('intermedia', eye, key, val)}
            />
          </div>

          {/* Historia clínica */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-5">Historia clínica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['razon_consulta', 'Razón de consulta'],
                ['sintomatologia', 'Sintomatología'],
                ['diagnostico', 'Diagnóstico'],
                ['tratamiento', 'Tratamiento'],
                ['historia_ocular', 'Historia ocular'],
                ['historial_familiar', 'Historial familiar'],
              ] as [keyof PrescriptionData, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <textarea
                    value={rx[field] as string}
                    onChange={e => setRx(p => ({ ...p, [field]: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    placeholder={label + '...'}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Comentarios</label>
                <textarea
                  value={rx.comentarios}
                  onChange={e => setRx(p => ({ ...p, comentarios: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Comentarios adicionales..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingRx}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {savingRx ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar historia
            </button>
            {savedRx && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle size={14} /> Guardado
              </span>
            )}
          </div>
        </form>
      )}

      {/* ══════════════════ TAB: COMPRAS ══════════════════ */}
      {activeTab === 'compras' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800">Historial de compras</h2>
            <button
              disabled
              title="Próximamente"
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={14} />
              Agregar compra
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['MES', 'RUC/DNI', 'Ciudad', 'Vendedor', 'Monto', 'Cantidad', 'Precio uni', 'Costo', 'Margen', 'Facturado por', 'Fecha', 'Guía/Factura', 'Comentarios', 'Tipo pago', 'Cuotas', 'Fechas pago', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={17} className="px-6 py-16 text-center text-gray-400">
                    Sin compras registradas aún.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB: CITAS ══════════════════ */}
      {activeTab === 'citas' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800">Citas</h2>
            <button
              onClick={() => setShowApptModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={14} />
              Agregar cita
            </button>
          </div>

          {loadingAppts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Fecha', 'Hora', 'Tipo', 'Doctor', 'Notas', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-gray-400 text-sm">
                      Sin citas registradas. Crea la primera con el botón de arriba.
                    </td>
                  </tr>
                ) : (
                  appointments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-700">{a.fecha}</td>
                      <td className="px-4 py-3 text-gray-500">{a.hora}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{a.tipo}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.doctor || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{a.notas || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          a.status === 'completada'
                            ? 'bg-green-50 text-green-700'
                            : a.status === 'cancelada'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal: Agregar Cita ── */}
      {showApptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                <h2 className="font-bold text-gray-900">Nueva cita</h2>
              </div>
              <button onClick={() => setShowApptModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveAppointment} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha *</label>
                  <input
                    required
                    type="date"
                    value={apptFecha}
                    onChange={e => setApptFecha(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hora</label>
                  <input
                    type="time"
                    value={apptHora}
                    onChange={e => setApptHora(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</label>
                <select
                  value={apptTipo}
                  onChange={e => setApptTipo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {['Examen visual', 'Control', 'Adaptación', 'Otro'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Doctor</label>
                <input
                  value={apptDoctor}
                  onChange={e => setApptDoctor(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Dr. García"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas</label>
                <textarea
                  value={apptNotas}
                  onChange={e => setApptNotas(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Observaciones..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowApptModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAppt}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
                >
                  {savingAppt ? <Loader2 size={14} className="animate-spin" /> : null}
                  Guardar cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
