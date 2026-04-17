'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Save, CheckCircle, X, Plus, Trash2, Bot, User, Clock, Tag, Send, Loader2,
  CreditCard, Package, MessageSquare, Settings, HelpCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type ResponseLength = 'muy_conciso' | 'conciso' | 'equilibrado' | 'detallado' | 'muy_detallado'
type Gender = 'Masculino' | 'Femenino' | 'Neutro'

interface DaySchedule {
  active: boolean
  from: string
  to: string
}

interface PromoItem {
  id: string
  name: string
  desc: string
  conditions: string
  discount: string
}

interface ShippingZone {
  id: string
  name: string
  price: string
  desc: string
}

interface PaymentMethod {
  id: string
  name: string
  selected: boolean
  tipo: string
  instructions: string
}

const DAYS: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const DEFAULT_SCHEDULE: Record<string, DaySchedule> = Object.fromEntries(
  Object.keys(DAYS).map(d => [d, {
    active: !['sabado', 'domingo'].includes(d),
    from: '09:00', to: '18:00',
  }])
)

const DEFAULT_PAYMENTS: PaymentMethod[] = [
  { id: '1', name: 'Yape',          selected: false, tipo: 'billetera virtual',  instructions: '' },
  { id: '2', name: 'Plin',          selected: false, tipo: 'billetera virtual',  instructions: '' },
  { id: '3', name: 'Transferencia', selected: false, tipo: 'transferencia',      instructions: '' },
  { id: '4', name: 'Contraentrega', selected: false, tipo: 'efectivo',           instructions: '' },
  { id: '5', name: 'Bitcoin',       selected: false, tipo: 'criptomoneda',       instructions: '' },
  { id: '6', name: 'Depósito',      selected: false, tipo: 'transferencia',      instructions: '' },
  { id: '7', name: 'Efectivo',      selected: false, tipo: 'efectivo',           instructions: '' },
]

const SECTIONS = [
  { id: 0,  label: 'Información básica',   Icon: User        },
  { id: 1,  label: 'Personalidad',          Icon: Bot         },
  { id: 2,  label: 'Mensajes',              Icon: MessageSquare },
  { id: 3,  label: 'Horarios de atención',  Icon: Clock       },
  { id: 4,  label: 'Promociones',           Icon: Tag         },
  { id: 5,  label: 'Envíos',                Icon: Package     },
  { id: 6,  label: 'Pagos',                 Icon: CreditCard  },
  { id: 7,  label: 'Reclamos',              Icon: HelpCircle  },
  { id: 8,  label: 'Devoluciones',          Icon: Settings    },
  { id: 9,  label: 'Otros',                 Icon: Settings    },
  { id: 10, label: 'Demo del chatbot',       Icon: Bot         },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IAPage() {
  const [tenant, setTenant]   = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [activeSection, setActiveSection] = useState(0)

  // Section 1 — Información básica
  const [sellerName, setSellerName]       = useState('')
  const [sellerGender, setSellerGender]   = useState<Gender>('Neutro')
  const [companyName, setCompanyName]     = useState('')
  const [country, setCountry]             = useState('Perú')
  const [businessDesc, setBusinessDesc]   = useState('')
  const [audience, setAudience]           = useState('')

  // Section 2 — Personalidad
  const [rules, setRules]                         = useState('')
  const [commStyle, setCommStyle]                 = useState('')
  const [salesStyle, setSalesStyle]               = useState('')
  const [responseLength, setResponseLength]       = useState<ResponseLength>('equilibrado')
  const [useEmojis, setUseEmojis]                 = useState(true)
  const [useOpeningSigns, setUseOpeningSigns]     = useState(false)
  const [forbiddenWords, setForbiddenWords]       = useState<string[]>([])
  const [forbiddenInput, setForbiddenInput]       = useState('')
  const [emojiPalette, setEmojiPalette]           = useState('')

  // Section 3 — Mensajes
  const [welcomeMsg, setWelcomeMsg]     = useState('¡Hola! ¿En qué te puedo ayudar hoy?')
  const [purchaseMsg, setPurchaseMsg]   = useState('¡Gracias por tu compra! En breve recibirás la confirmación de tu pedido.')
  const [handoffMsg, setHandoffMsg]     = useState('Voy a conectarte con un asesor de nuestro equipo. Un momento por favor.')

  // Section 4 — Horarios
  const [alwaysOn, setAlwaysOn]             = useState(true)
  const [schedule, setSchedule]             = useState<Record<string, DaySchedule>>(DEFAULT_SCHEDULE)
  const [outsideHoursMsg, setOutsideHoursMsg] = useState('Nuestro horario de atención ha concluido. Te responderemos a la brevedad.')

  function updateDay(day: string, patch: Partial<DaySchedule>) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  // Section 5 — Promociones
  const [promotions, setPromotions] = useState<PromoItem[]>([])
  function addPromo() {
    setPromotions(prev => [...prev, { id: Math.random().toString(36).slice(2), name: '', desc: '', conditions: '', discount: '' }])
  }
  function updatePromo(id: string, patch: Partial<PromoItem>) {
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  // Section 6 — Envíos
  const [shippingZoneName, setShippingZoneName]   = useState('')
  const [shippingPayTypes, setShippingPayTypes]   = useState('')
  const [cashOnDelivery, setCashOnDelivery]       = useState(false)
  const [partialPayment, setPartialPayment]       = useState(false)
  const [partialAmount, setPartialAmount]         = useState('')
  const [shippingZones, setShippingZones]         = useState<ShippingZone[]>([])
  function addZone() {
    setShippingZones(prev => [...prev, { id: Math.random().toString(36).slice(2), name: '', price: '', desc: '' }])
  }
  function updateZone(id: string, patch: Partial<ShippingZone>) {
    setShippingZones(prev => prev.map(z => z.id === id ? { ...z, ...patch } : z))
  }

  // Section 7 — Pagos
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENTS)
  function togglePayment(id: string) {
    setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m))
  }
  function updatePayment(id: string, patch: Partial<PaymentMethod>) {
    setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  // Section 8-10
  const [claimsText, setClaimsText]   = useState('')
  const [returnsText, setReturnsText] = useState('')
  const [otherText, setOtherText]     = useState('')

  // Section 11 — Demo chat
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const demoSessionId = useRef(`demo-${Math.random().toString(36).slice(2)}`)
  const chatEndRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  // ── Load tenant ──
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const meRes = await fetch('/api/me', { headers: { authorization: `Bearer ${session.access_token}` } })
      if (!meRes.ok) { setLoading(false); return }
      const { tenant: t } = await meRes.json()
      if (!t) { setLoading(false); return }
      setTenant(t)

      const c = t.config ?? {}
      setSellerName(c.seller_name ?? t.avatar_name ?? '')
      setSellerGender(c.seller_gender ?? 'Neutro')
      setCompanyName(c.company_name ?? t.name ?? '')
      setCountry(c.country ?? 'Perú')
      setBusinessDesc(c.business_description ?? '')
      setAudience(c.audience ?? '')
      setRules(c.ai_rules ?? '')
      setCommStyle(c.communication_style ?? '')
      setSalesStyle(c.sales_style ?? '')
      setResponseLength(c.response_length ?? 'equilibrado')
      setUseEmojis(c.use_emojis ?? true)
      setUseOpeningSigns(c.use_opening_signs ?? false)
      setForbiddenWords(c.forbidden_words ?? [])
      setEmojiPalette(c.emoji_palette ?? '')
      setWelcomeMsg(c.welcome_message ?? '¡Hola! ¿En qué te puedo ayudar hoy?')
      setPurchaseMsg(c.purchase_confirm_message ?? '¡Gracias por tu compra! En breve recibirás la confirmación de tu pedido.')
      setHandoffMsg(c.human_handoff_message ?? 'Voy a conectarte con un asesor de nuestro equipo. Un momento por favor.')
      setAlwaysOn(c.always_on ?? true)
      setSchedule(c.schedule ?? DEFAULT_SCHEDULE)
      setOutsideHoursMsg(c.outside_hours_message ?? 'Nuestro horario de atención ha concluido. Te responderemos a la brevedad.')
      setPromotions(c.ai_promotions ?? [])
      setShippingZoneName(c.shipping?.zone_name ?? '')
      setShippingPayTypes(c.shipping?.payment_types ?? '')
      setCashOnDelivery(c.shipping?.cash_on_delivery ?? false)
      setPartialPayment(c.shipping?.partial_payment ?? false)
      setPartialAmount(c.shipping?.partial_amount ?? '')
      setShippingZones(c.shipping?.zones ?? [])
      if (c.payment_methods?.length) setPaymentMethods(c.payment_methods)
      setClaimsText(c.claims_instructions ?? '')
      setReturnsText(c.returns_policy ?? '')
      setOtherText(c.other_info ?? '')

      // Show welcome from AI in demo chat
      const welcomeText = c.welcome_message ?? '¡Hola! ¿En qué te puedo ayudar hoy?'
      if (welcomeText) {
        setChatMessages([{ role: 'assistant', content: welcomeText }])
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Save all ──
  async function saveAll() {
    if (!tenant || saving) return
    setSaving(true)

    const newConfig = {
      ...(tenant.config ?? {}),
      seller_name: sellerName,
      seller_gender: sellerGender,
      company_name: companyName,
      country,
      business_description: businessDesc,
      audience,
      ai_rules: rules,
      communication_style: commStyle,
      sales_style: salesStyle,
      response_length: responseLength,
      use_emojis: useEmojis,
      use_opening_signs: useOpeningSigns,
      forbidden_words: forbiddenWords,
      emoji_palette: emojiPalette,
      welcome_message: welcomeMsg,
      purchase_confirm_message: purchaseMsg,
      human_handoff_message: handoffMsg,
      always_on: alwaysOn,
      schedule,
      outside_hours_message: outsideHoursMsg,
      ai_promotions: promotions,
      shipping: {
        zone_name: shippingZoneName,
        payment_types: shippingPayTypes,
        cash_on_delivery: cashOnDelivery,
        partial_payment: partialPayment,
        partial_amount: partialAmount,
        zones: shippingZones,
      },
      payment_methods: paymentMethods,
      claims_instructions: claimsText,
      returns_policy: returnsText,
      other_info: otherText,
    }

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  // ── Demo chat ──
  async function sendDemoMessage() {
    if (!tenant || !chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: demoSessionId.current, tenant_token: tenant.widget_token }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Sin respuesta del asistente.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el asistente.' }])
    }
    setChatLoading(false)
  }

  // ─── Render section content ───────────────────────────────────────────────

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white'
  const lbl = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

  function renderSection() {
    switch (activeSection) {

      case 0: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Información básica</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del vendedor">
              <input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="ej: Sofía" className={inp} />
            </Field>
            <Field label="Género del vendedor">
              <select value={sellerGender} onChange={e => setSellerGender(e.target.value as Gender)} className={inp}>
                <option>Masculino</option><option>Femenino</option><option>Neutro</option>
              </select>
            </Field>
            <Field label="Nombre de la empresa">
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ej: Óptica Visión Plus" className={inp} />
            </Field>
            <Field label="País de operación">
              <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Perú" className={inp} />
            </Field>
            <Field label="Descripción de la empresa" wide>
              <textarea value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} rows={3} placeholder="Describe tu empresa, servicios, valores…" className={`${inp} resize-none`} />
            </Field>
            <Field label="A quién le vendes / Audiencia" wide>
              <textarea value={audience} onChange={e => setAudience(e.target.value)} rows={3} placeholder="Ej: Adultos de 25-55 años que buscan lentes de calidad…" className={`${inp} resize-none`} />
            </Field>
          </div>
        </div>
      )

      case 1: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Personalidad</h2>
          <Field label="Reglas para mi vendedor">
            <textarea value={rules} onChange={e => setRules(e.target.value)} rows={5} placeholder="Ej: Siempre saluda por nombre. No ofrezcas descuentos sin consultar primero. Prioriza la experiencia del cliente…" className={`${inp} resize-none`} />
          </Field>
          <Field label="Estilo de comunicación">
            <textarea value={commStyle} onChange={e => setCommStyle(e.target.value)} rows={3} placeholder="Ej: Amigable, cercano, usa frases cortas y directas…" className={`${inp} resize-none`} />
          </Field>
          <Field label="Estilo de ventas">
            <textarea value={salesStyle} onChange={e => setSalesStyle(e.target.value)} rows={3} placeholder="Ej: Consultivo, escucha las necesidades antes de recomendar…" className={`${inp} resize-none`} />
          </Field>
          <Field label="Longitud de respuestas">
            <div className="flex flex-wrap gap-2">
              {(['muy_conciso', 'conciso', 'equilibrado', 'detallado', 'muy_detallado'] as ResponseLength[]).map(v => (
                <button key={v} type="button" onClick={() => setResponseLength(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${responseLength === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {v === 'muy_conciso' ? 'Muy conciso' : v === 'conciso' ? 'Conciso' : v === 'equilibrado' ? 'Equilibrado' : v === 'detallado' ? 'Detallado' : 'Muy detallado'}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <ToggleField label="Usar emojis" value={useEmojis} onChange={setUseEmojis} />
            <ToggleField label="Usar signos de apertura ¡¿" value={useOpeningSigns} onChange={setUseOpeningSigns} />
          </div>
          <Field label="Palabras a evitar">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {forbiddenWords.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-full">
                  {w}
                  <button type="button" onClick={() => setForbiddenWords(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                </span>
              ))}
            </div>
            <input
              value={forbiddenInput} onChange={e => setForbiddenInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && forbiddenInput.trim()) { e.preventDefault(); setForbiddenWords(prev => [...prev, forbiddenInput.trim()]); setForbiddenInput('') } }}
              placeholder="Escribe y presiona Enter para agregar…"
              className={inp}
            />
          </Field>
          <Field label="Paleta de emojis permitidos">
            <input value={emojiPalette} onChange={e => setEmojiPalette(e.target.value)} placeholder="ej: 😊 👍 💪 ✅ 🎯" className={inp} />
          </Field>
        </div>
      )

      case 2: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Mensajes predefinidos</h2>
          <Field label="Mensaje de bienvenida">
            <textarea value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} rows={3} className={`${inp} resize-none`} />
          </Field>
          <Field label="Mensaje de confirmación de compra">
            <textarea value={purchaseMsg} onChange={e => setPurchaseMsg(e.target.value)} rows={3} className={`${inp} resize-none`} />
          </Field>
          <Field label="Mensaje de derivación a humano">
            <textarea value={handoffMsg} onChange={e => setHandoffMsg(e.target.value)} rows={3} className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 3: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Horarios de atención</h2>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Toggle value={alwaysOn} onChange={setAlwaysOn} />
            <div>
              <p className="text-sm font-medium text-gray-900">{alwaysOn ? 'Responder siempre (24/7)' : 'Solo en horario de atención'}</p>
              <p className="text-xs text-gray-500">Cuando esté desactivado, solo responderá en el horario configurado</p>
            </div>
          </div>
          {!alwaysOn && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {Object.entries(DAYS).map(([key, label]) => {
                const day = schedule[key] ?? { active: false, from: '09:00', to: '18:00' }
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                    <Toggle value={day.active} onChange={v => updateDay(key, { active: v })} />
                    <span className="text-sm font-medium text-gray-700 w-24">{label}</span>
                    <div className={`flex items-center gap-2 flex-1 ${!day.active ? 'opacity-40 pointer-events-none' : ''}`}>
                      <input type="time" value={day.from} onChange={e => updateDay(key, { from: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      <span className="text-gray-400 text-xs">a</span>
                      <input type="time" value={day.to} onChange={e => updateDay(key, { to: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Field label="Mensaje fuera de horario">
            <textarea value={outsideHoursMsg} onChange={e => setOutsideHoursMsg(e.target.value)} rows={2} className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 4: return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Promociones</h2>
            <button type="button" onClick={addPromo} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
              <Plus size={13} /> Agregar promoción
            </button>
          </div>
          {promotions.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <Tag size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin promociones. Agrega la primera.</p>
            </div>
          ) : (
            promotions.map(p => (
              <div key={p.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Promoción</p>
                  <button type="button" onClick={() => setPromotions(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Nombre</label><input value={p.name} onChange={e => updatePromo(p.id, { name: e.target.value })} placeholder="Promo verano" className={inp} /></div>
                  <div><label className={lbl}>Descuento</label><input value={p.discount} onChange={e => updatePromo(p.id, { discount: e.target.value })} placeholder="ej: 20%" className={inp} /></div>
                  <div className="col-span-2"><label className={lbl}>Descripción</label><input value={p.desc} onChange={e => updatePromo(p.id, { desc: e.target.value })} placeholder="Descripción de la promo" className={inp} /></div>
                  <div className="col-span-2"><label className={lbl}>Condiciones de activación</label><input value={p.conditions} onChange={e => updatePromo(p.id, { conditions: e.target.value })} placeholder="ej: Cuando el cliente mencione 'verano'" className={inp} /></div>
                </div>
              </div>
            ))
          )}
        </div>
      )

      case 5: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Envíos</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre de la zona general">
              <input value={shippingZoneName} onChange={e => setShippingZoneName(e.target.value)} placeholder="ej: Lima Metropolitana" className={inp} />
            </Field>
            <Field label="Tipos de pago aceptados">
              <input value={shippingPayTypes} onChange={e => setShippingPayTypes(e.target.value)} placeholder="ej: Yape, efectivo, transferencia" className={inp} />
            </Field>
            <ToggleField label="Opción contraentrega" value={cashOnDelivery} onChange={setCashOnDelivery} />
            <div>
              <ToggleField label="Pago parcial" value={partialPayment} onChange={setPartialPayment} />
              {partialPayment && (
                <input value={partialAmount} onChange={e => setPartialAmount(e.target.value)} placeholder="Monto mínimo ej: S/.50" className={`${inp} mt-2`} />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 mb-2">
            <h3 className="text-sm font-bold text-gray-800">Zonas de envío ({shippingZones.length}/20)</h3>
            {shippingZones.length < 20 && (
              <button type="button" onClick={addZone} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"><Plus size={12} /> Agregar zona</button>
            )}
          </div>
          {shippingZones.map(z => (
            <div key={z.id} className="grid grid-cols-3 gap-2 border border-gray-200 rounded-xl p-3">
              <div><label className={lbl}>Nombre zona</label><input value={z.name} onChange={e => updateZone(z.id, { name: e.target.value })} placeholder="San Isidro" className={inp} /></div>
              <div><label className={lbl}>Precio envío</label><input value={z.price} onChange={e => updateZone(z.id, { price: e.target.value })} placeholder="S/.10" className={inp} /></div>
              <div className="relative"><label className={lbl}>Descripción</label><input value={z.desc} onChange={e => updateZone(z.id, { desc: e.target.value })} placeholder="1-2 días hábiles" className={inp} />
                <button type="button" onClick={() => setShippingZones(prev => prev.filter(x => x.id !== z.id))} className="absolute top-0 right-0 text-gray-400 hover:text-red-500"><X size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )

      case 6: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Métodos de pago</h2>
          <div className="space-y-3">
            {paymentMethods.map(m => (
              <div key={m.id} className={`border rounded-xl overflow-hidden transition-all ${m.selected ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <input type="checkbox" checked={m.selected} onChange={() => togglePayment(m.id)} className="rounded" />
                  <span className="text-sm font-medium text-gray-900 flex-1">{m.name}</span>
                  {m.selected && (
                    <select value={m.tipo} onChange={e => updatePayment(m.id, { tipo: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none">
                      <option value="billetera virtual">Billetera virtual</option>
                      <option value="transferencia">Transferencia bancaria</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="criptomoneda">Criptomoneda</option>
                    </select>
                  )}
                </div>
                {m.selected && (
                  <div className="px-4 pb-3">
                    <input value={m.instructions} onChange={e => updatePayment(m.id, { instructions: e.target.value })} placeholder={`Instrucciones de pago con ${m.name}…`} className={inp} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setPaymentMethods(prev => [...prev, { id: Math.random().toString(36).slice(2), name: 'Nuevo método', selected: true, tipo: 'efectivo', instructions: '' }])} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Plus size={14} /> Agregar método de pago
          </button>
        </div>
      )

      case 7: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Reclamos</h2>
          <Field label="Instrucciones para manejo de reclamos">
            <textarea value={claimsText} onChange={e => setClaimsText(e.target.value)} rows={8} placeholder="Describe cómo el asistente debe manejar reclamos: pasos a seguir, tiempos de respuesta, escalado a humanos…" className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 8: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Devoluciones</h2>
          <Field label="Política de devoluciones">
            <textarea value={returnsText} onChange={e => setReturnsText(e.target.value)} rows={8} placeholder="Describe la política de devoluciones: plazos, condiciones, proceso, excepciones…" className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 9: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Información adicional</h2>
          <Field label="Otra información relevante">
            <textarea value={otherText} onChange={e => setOtherText(e.target.value)} rows={8} placeholder="Cualquier otra información que el asistente deba conocer sobre tu negocio: preguntas frecuentes, restricciones, datos especiales…" className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 10: return (
        <div className="flex flex-col h-full">
          <h2 className="text-base font-bold text-gray-900 mb-4">Demo del chatbot</h2>
          <p className="text-sm text-gray-500 mb-4">
            Prueba cómo responde el asistente con la configuración guardada. Los mensajes usan la IA real.
          </p>
          <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden flex flex-col bg-gray-50" style={{ minHeight: 400 }}>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && !loading && (
                <div className="text-center text-gray-400 text-sm pt-8">El asistente enviará el mensaje de bienvenida cuando guardes la configuración.</div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl">
                    <span className="flex gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Chat input */}
            <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendDemoMessage()}
                placeholder="Escribe un mensaje para probar…"
                disabled={chatLoading || !tenant}
                className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
              />
              <button
                onClick={sendDemoMessage}
                disabled={chatLoading || !chatInput.trim() || !tenant}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl flex items-center justify-center transition-colors"
              >
                {chatLoading ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
              </button>
            </div>
          </div>
        </div>
      )

      default: return null
    }
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asistente IA</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configura el comportamiento del asistente de ventas</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {saved ? <><CheckCircle size={15} /> Guardado</> : saving ? <><Loader2 size={15} className="animate-spin" /> Guardando…</> : <><Save size={15} /> Guardar cambios</>}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <aside className="w-56 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto py-3">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                activeSection === id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={15} className={activeSection === id ? 'text-blue-600' : 'text-gray-400'} />
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={28} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="max-w-2xl">{renderSection()}</div>
          )}
        </main>
      </div>
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}
