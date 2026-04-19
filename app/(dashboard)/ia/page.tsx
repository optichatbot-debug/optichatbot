'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Save, CheckCircle, X, Plus, Trash2, Bot, User, Clock, Tag, Send, Loader2,
  CreditCard, Package, MessageSquare, Settings, HelpCircle, Percent, ShoppingBag,
  Truck, RefreshCw, Calendar, ChevronRight,
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
  nombre_entidad: string
  instructions: string
}

// CHANGE 3 — FaqItem interface
interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
}

interface Discount {
  id: string
  type: 'product' | 'buy_x_get_y' | 'order' | 'free_shipping'
  method: 'code' | 'automatic'
  code: string
  valueType: 'percent' | 'fixed'
  value: string
  appliesTo: 'all_products' | 'collections' | 'specific_products'
  eligibility: 'all' | 'segments' | 'specific'
  minRequirement: 'none' | 'amount' | 'quantity'
  minValue: string
  limitTotal: boolean
  totalLimit: string
  limitPerCustomer: boolean
  combineProduct: boolean
  combineOrder: boolean
  combineShipping: boolean
  startDate: string
  startTime: string
  hasEndDate: boolean
  endDate: string
  endTime: string
  active: boolean
  minQty: string
  freeProduct: string
  excludedRates: string
}

const EMPTY_DISCOUNT: Discount = {
  id: '', type: 'product', method: 'code', code: '', valueType: 'percent', value: '',
  appliesTo: 'all_products', eligibility: 'all', minRequirement: 'none', minValue: '',
  limitTotal: false, totalLimit: '', limitPerCustomer: false,
  combineProduct: false, combineOrder: false, combineShipping: false,
  startDate: new Date().toISOString().split('T')[0], startTime: '00:00',
  hasEndDate: false, endDate: '', endTime: '23:59',
  active: true, minQty: '', freeProduct: '', excludedRates: '',
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

// CHANGE 2 — nombre_entidad added to each entry
const DEFAULT_PAYMENTS: PaymentMethod[] = [
  { id: '1', name: 'Yape',          selected: false, tipo: 'billetera virtual',  nombre_entidad: '', instructions: '' },
  { id: '2', name: 'Plin',          selected: false, tipo: 'billetera virtual',  nombre_entidad: '', instructions: '' },
  { id: '3', name: 'Transferencia', selected: false, tipo: 'transferencia',      nombre_entidad: '', instructions: '' },
  { id: '4', name: 'Contraentrega', selected: false, tipo: 'efectivo',           nombre_entidad: '', instructions: '' },
  { id: '5', name: 'Bitcoin',       selected: false, tipo: 'criptomoneda',       nombre_entidad: '', instructions: '' },
  { id: '6', name: 'Depósito',      selected: false, tipo: 'transferencia',      nombre_entidad: '', instructions: '' },
  { id: '7', name: 'Efectivo',      selected: false, tipo: 'efectivo',           nombre_entidad: '', instructions: '' },
]

// CHANGE 3 — FAQ categories constant
const FAQ_CATS = ['Productos', 'Horarios', 'Envíos', 'Pagos', 'Devoluciones', 'Otros']

const SECTIONS = [
  { id: 0,  label: 'Información básica',    Icon: User          },
  { id: 1,  label: 'Personalidad',           Icon: Bot           },
  { id: 2,  label: 'Mensajes',               Icon: MessageSquare },
  { id: 3,  label: 'Preguntas Frecuentes',   Icon: HelpCircle    },
  { id: 4,  label: 'Horarios de atención',   Icon: Clock         },
  { id: 5,  label: 'Promociones',            Icon: Tag           },
  { id: 6,  label: 'Envíos',                 Icon: Package       },
  { id: 7,  label: 'Pagos',                  Icon: CreditCard    },
  { id: 8,  label: 'Descuentos',             Icon: Percent       },
  { id: 9,  label: 'Reclamos',               Icon: HelpCircle    },
  { id: 10, label: 'Devoluciones',           Icon: RefreshCw     },
  { id: 11, label: 'Otros',                  Icon: Settings      },
  { id: 12, label: 'Demo del chatbot',        Icon: Bot           },
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

  // Section 0 — Información básica
  const [sellerName, setSellerName]             = useState('')
  const [sellerGender, setSellerGender]         = useState<Gender>('Neutro')
  const [companyName, setCompanyName]           = useState('')
  const [country, setCountry]                   = useState('Perú')
  const [businessDesc, setBusinessDesc]         = useState('')
  const [audience, setAudience]                 = useState('')
  // CHANGE 1 — new field
  const [instruccionesEspeciales, setInstruccionesEspeciales] = useState('')

  // Section 1 — Personalidad
  const [rules, setRules]                         = useState('')
  const [commStyle, setCommStyle]                 = useState('')
  const [salesStyle, setSalesStyle]               = useState('')
  const [responseLength, setResponseLength]       = useState<ResponseLength>('equilibrado')
  const [useEmojis, setUseEmojis]                 = useState(true)
  const [useOpeningSigns, setUseOpeningSigns]     = useState(false)
  const [forbiddenWords, setForbiddenWords]       = useState<string[]>([])
  const [forbiddenInput, setForbiddenInput]       = useState('')
  const [emojiPalette, setEmojiPalette]           = useState('')

  // Section 2 — Mensajes
  const [welcomeMsg, setWelcomeMsg]     = useState('¡Hola! ¿En qué te puedo ayudar hoy?')
  const [purchaseMsg, setPurchaseMsg]   = useState('¡Gracias por tu compra! En breve recibirás la confirmación de tu pedido.')
  const [handoffMsg, setHandoffMsg]     = useState('Voy a conectarte con un asesor de nuestro equipo. Un momento por favor.')

  // Section 3 — Preguntas Frecuentes (CHANGE 3)
  const [faqs, setFaqs]                   = useState<FaqItem[]>([])
  const [faqActiveCat, setFaqActiveCat]   = useState('Todas')
  const [faqModalCat, setFaqModalCat]     = useState<string | null>(null)
  const [faqQ, setFaqQ]                   = useState('')
  const [faqA, setFaqA]                   = useState('')

  // Section 4 — Horarios
  const [alwaysOn, setAlwaysOn]               = useState(true)
  const [schedule, setSchedule]               = useState<Record<string, DaySchedule>>(DEFAULT_SCHEDULE)
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

  // Section 8 — Descuentos
  const [discounts, setDiscounts]                 = useState<Discount[]>([])
  const [discountTypeModal, setDiscountTypeModal] = useState(false)
  const [discountForm, setDiscountForm]           = useState<Discount | null>(null)

  // Section 9-11
  const [claimsText, setClaimsText]   = useState('')
  const [returnsText, setReturnsText] = useState('')
  const [otherText, setOtherText]     = useState('')

  // Section 12 — Demo chat
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
      // CHANGE 1 — load instrucciones_especiales
      setInstruccionesEspeciales(c.instrucciones_especiales ?? '')
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
      // CHANGE 3 — load faqs
      setFaqs(c.faqs ?? [])
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
      setDiscounts((c.discounts ?? []) as Discount[])
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
      // CHANGE 1 — save instrucciones_especiales
      instrucciones_especiales: instruccionesEspeciales,
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
      // CHANGE 3 — save faqs
      faqs,
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
      discounts,
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
            {/* CHANGE 1 — Instrucciones especiales field */}
            <Field label="Instrucciones especiales para tu vendedor" wide>
              <textarea value={instruccionesEspeciales} onChange={e => setInstruccionesEspeciales(e.target.value)} rows={3} placeholder="Ej: Siempre menciona el tiempo de garantía. No hables de la competencia. Ofrece siempre el plan de financiamiento…" className={`${inp} resize-none`} />
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

      // CHANGE 3 — new case 3: Preguntas Frecuentes
      case 3: {
        const allCats = ['Todas', ...FAQ_CATS]
        const filteredFaqs = faqActiveCat === 'Todas'
          ? faqs
          : faqs.filter(f => f.category === faqActiveCat)
        const countInCat = faqActiveCat === 'Todas' ? 0 : faqs.filter(f => f.category === faqActiveCat).length

        return (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>

            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-1.5">
              {allCats.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFaqActiveCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    faqActiveCat === cat
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Add button + count — only visible when a specific category is selected */}
            {faqActiveCat !== 'Todas' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{countInCat}/5 preguntas en esta categoría</span>
                {countInCat < 5 && (
                  <button
                    type="button"
                    onClick={() => { setFaqQ(''); setFaqA(''); setFaqModalCat(faqActiveCat) }}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus size={13} /> Añadir pregunta frecuente
                  </button>
                )}
              </div>
            )}

            {/* FAQ list */}
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <HelpCircle size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {faqActiveCat === 'Todas'
                    ? 'Aún no hay preguntas frecuentes. Selecciona una categoría para comenzar.'
                    : `Sin preguntas en "${faqActiveCat}". Agrega la primera.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map(faq => (
                  <div key={faq.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 mb-1">{faq.question}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFaqs(prev => prev.filter(f => f.id !== faq.id))}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0 mt-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {faq.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case 4: return (
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

      case 5: return (
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

      case 6: return (
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

      // CHANGE 2 — case 7 (was 6): two fields when method is selected
      case 7: return (
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
                  <div className="px-4 pb-3 space-y-2">
                    {/* CHANGE 2 — nombre_entidad field */}
                    <input
                      value={m.nombre_entidad}
                      onChange={e => updatePayment(m.id, { nombre_entidad: e.target.value })}
                      placeholder={`Nombre entidad (ej: BCP, Banco X)…`}
                      className={inp}
                    />
                    {/* CHANGE 2 — instructions as textarea */}
                    <textarea
                      value={m.instructions}
                      onChange={e => updatePayment(m.id, { instructions: e.target.value })}
                      rows={3}
                      placeholder={`Instrucciones de pago con ${m.name}…`}
                      className={`${inp} resize-none`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setPaymentMethods(prev => [...prev, { id: Math.random().toString(36).slice(2), name: 'Nuevo método', selected: true, tipo: 'efectivo', nombre_entidad: '', instructions: '' }])} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Plus size={14} /> Agregar método de pago
          </button>
        </div>
      )

      case 8: {
        const typeLabels: Record<string, string> = {
          product: 'Descuento en productos',
          buy_x_get_y: 'Compra X y obtén Y',
          order: 'Descuento en el pedido',
          free_shipping: 'Envío gratis',
        }
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Descuentos</h2>
              <button
                type="button"
                onClick={() => setDiscountTypeModal(true)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={13} /> Crear descuento
              </button>
            </div>
            {discounts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Percent size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin descuentos creados. Crea el primero.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {discounts.map(d => (
                  <div key={d.id} className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {d.method === 'code' && d.code ? d.code : '(Descuento automático)'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {typeLabels[d.type] || d.type} · {d.valueType === 'percent' ? `${d.value}%` : `S/.${d.value}`} de descuento
                      </p>
                    </div>
                    <Toggle value={d.active} onChange={v => setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, active: v } : x))} />
                    <button
                      type="button"
                      onClick={() => setDiscountForm(d)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <ChevronRight size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscounts(prev => prev.filter(x => x.id !== d.id))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case 9: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Reclamos</h2>
          <Field label="Instrucciones para manejo de reclamos">
            <textarea value={claimsText} onChange={e => setClaimsText(e.target.value)} rows={8} placeholder="Describe cómo el asistente debe manejar reclamos: pasos a seguir, tiempos de respuesta, escalado a humanos…" className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 10: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Devoluciones</h2>
          <Field label="Política de devoluciones">
            <textarea value={returnsText} onChange={e => setReturnsText(e.target.value)} rows={8} placeholder="Describe la política de devoluciones: plazos, condiciones, proceso, excepciones…" className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 11: return (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-4">Información adicional</h2>
          <Field label="Otra información relevante">
            <textarea value={otherText} onChange={e => setOtherText(e.target.value)} rows={8} placeholder="Cualquier otra información que el asistente deba conocer sobre tu negocio: preguntas frecuentes, restricciones, datos especiales…" className={`${inp} resize-none`} />
          </Field>
        </div>
      )

      case 12: return (
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

      {/* CHANGE 3 — FAQ modal */}
      {faqModalCat !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Añadir pregunta — <span className="text-blue-600">{faqModalCat}</span>
              </h3>
              <button type="button" onClick={() => setFaqModalCat(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Pregunta</label>
                <input
                  value={faqQ}
                  onChange={e => setFaqQ(e.target.value)}
                  placeholder="¿Cuál es el tiempo de entrega?"
                  className={inp}
                  autoFocus
                />
              </div>
              <div>
                <label className={lbl}>Respuesta</label>
                <textarea
                  value={faqA}
                  onChange={e => setFaqA(e.target.value)}
                  rows={4}
                  placeholder="El tiempo de entrega es de 2 a 3 días hábiles…"
                  className={`${inp} resize-none`}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setFaqModalCat(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!faqQ.trim() || !faqA.trim()}
                onClick={() => {
                  if (!faqQ.trim() || !faqA.trim()) return
                  setFaqs(prev => [
                    ...prev,
                    {
                      id: Math.random().toString(36).slice(2),
                      question: faqQ.trim(),
                      answer: faqA.trim(),
                      category: faqModalCat!,
                    },
                  ])
                  setFaqModalCat(null)
                  setFaqQ('')
                  setFaqA('')
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discount type selection modal ── */}
      {discountTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-900">Selecciona el tipo de descuento</h3>
              <button type="button" onClick={() => setDiscountTypeModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { type: 'product',        Icon: Tag,         title: 'Descuento en productos',   desc: 'Aplica descuentos a productos específicos o colecciones' },
                { type: 'buy_x_get_y',    Icon: ShoppingBag, title: 'Compra X y obtén Y',       desc: 'Regala un producto al comprar cierta cantidad' },
                { type: 'order',          Icon: Percent,     title: 'Descuento en el pedido',   desc: 'Aplica descuentos al importe total del pedido' },
                { type: 'free_shipping',  Icon: Truck,       title: 'Envío gratis',             desc: 'Ofrece envío gratis en un pedido' },
              ] as const).map(({ type, Icon, title, desc }) => (
                <div
                  key={type}
                  onClick={() => {
                    setDiscountTypeModal(false)
                    setDiscountForm({ ...EMPTY_DISCOUNT, id: Math.random().toString(36).slice(2), type })
                  }}
                  className="cursor-pointer border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-all"
                >
                  <Icon size={20} className="text-blue-600 mb-2" />
                  <p className="text-xs font-bold text-gray-800 mb-1">{title}</p>
                  <p className="text-[11px] text-gray-500 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Discount form modal ── */}
      {discountForm !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {discountForm.type === 'product' ? 'Descuento en productos' :
                 discountForm.type === 'buy_x_get_y' ? 'Compra X y obtén Y' :
                 discountForm.type === 'order' ? 'Descuento en el pedido' : 'Envío gratis'}
              </h3>
              <button type="button" onClick={() => setDiscountForm(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="flex gap-0">
              {/* Left: form */}
              <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[70vh]">

                {/* Método */}
                {discountForm.type !== 'free_shipping' && (
                  <div>
                    <label className={lbl}>Método</label>
                    <div className="flex gap-2">
                      {(['code', 'automatic'] as const).map(m => (
                        <button key={m} type="button"
                          onClick={() => setDiscountForm(f => f ? { ...f, method: m } : f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${discountForm.method === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          {m === 'code' ? 'Código de descuento' : 'Descuento automático'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code */}
                {discountForm.method === 'code' && discountForm.type !== 'free_shipping' && (
                  <div>
                    <label className={lbl}>Código de descuento</label>
                    <div className="flex gap-2">
                      <input
                        value={discountForm.code}
                        onChange={e => setDiscountForm(f => f ? { ...f, code: e.target.value.toUpperCase() } : f)}
                        placeholder="ej: VERANO20"
                        className={`${inp} flex-1 font-mono uppercase`}
                      />
                      <button type="button"
                        onClick={() => setDiscountForm(f => f ? { ...f, code: Math.random().toString(36).slice(2, 8).toUpperCase() } : f)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Generar código
                      </button>
                    </div>
                  </div>
                )}

                {/* Value */}
                {discountForm.type !== 'free_shipping' && discountForm.type !== 'buy_x_get_y' && (
                  <div>
                    <label className={lbl}>Valor del descuento</label>
                    <div className="flex gap-2">
                      <select value={discountForm.valueType}
                        onChange={e => setDiscountForm(f => f ? { ...f, valueType: e.target.value as 'percent' | 'fixed' } : f)}
                        className={`${inp} w-40`}
                      >
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo (S/.)</option>
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {discountForm.valueType === 'percent' ? '%' : 'S/.'}
                        </span>
                        <input type="number" value={discountForm.value}
                          onChange={e => setDiscountForm(f => f ? { ...f, value: e.target.value } : f)}
                          placeholder="0"
                          className={`${inp} pl-9`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Buy X get Y fields */}
                {discountForm.type === 'buy_x_get_y' && (
                  <div className="space-y-3">
                    <div>
                      <label className={lbl}>Cantidad mínima a comprar</label>
                      <input type="number" value={discountForm.minQty}
                        onChange={e => setDiscountForm(f => f ? { ...f, minQty: e.target.value } : f)}
                        placeholder="ej: 2"
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Producto gratuito</label>
                      <input value={discountForm.freeProduct}
                        onChange={e => setDiscountForm(f => f ? { ...f, freeProduct: e.target.value } : f)}
                        placeholder="Nombre del producto gratuito"
                        className={inp}
                      />
                    </div>
                  </div>
                )}

                {/* Se aplica a */}
                {discountForm.type !== 'free_shipping' && (
                  <div>
                    <label className={lbl}>Se aplica a</label>
                    <select value={discountForm.appliesTo}
                      onChange={e => setDiscountForm(f => f ? { ...f, appliesTo: e.target.value as Discount['appliesTo'] } : f)}
                      className={inp}
                    >
                      <option value="all_products">Todos los productos</option>
                      <option value="collections">Colecciones específicas</option>
                      <option value="specific_products">Productos específicos</option>
                    </select>
                  </div>
                )}

                {/* Elegibilidad */}
                <div>
                  <label className={lbl}>Elegibilidad del cliente</label>
                  <div className="space-y-1.5">
                    {([
                      { v: 'all',      l: 'Todos los clientes' },
                      { v: 'segments', l: 'Segmentos específicos' },
                      { v: 'specific', l: 'Clientes específicos' },
                    ] as const).map(({ v, l }) => (
                      <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="eligibility" checked={discountForm.eligibility === v}
                          onChange={() => setDiscountForm(f => f ? { ...f, eligibility: v } : f)}
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Requisitos mínimos */}
                {discountForm.type !== 'buy_x_get_y' && (
                  <div>
                    <label className={lbl}>Requisitos mínimos</label>
                    <div className="space-y-1.5">
                      {([
                        { v: 'none',     l: 'Sin requisitos' },
                        { v: 'amount',   l: 'Monto mínimo de compra (S/.)' },
                        { v: 'quantity', l: 'Cantidad mínima de artículos' },
                      ] as const).map(({ v, l }) => (
                        <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name="minReq" checked={discountForm.minRequirement === v}
                            onChange={() => setDiscountForm(f => f ? { ...f, minRequirement: v } : f)}
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                    {discountForm.minRequirement !== 'none' && (
                      <input type="number" value={discountForm.minValue}
                        onChange={e => setDiscountForm(f => f ? { ...f, minValue: e.target.value } : f)}
                        placeholder={discountForm.minRequirement === 'amount' ? 'Monto mínimo en S/.' : 'Cantidad mínima'}
                        className={`${inp} mt-2`}
                      />
                    )}
                  </div>
                )}

                {/* Envío gratis excluded rates */}
                {discountForm.type === 'free_shipping' && (
                  <div>
                    <label className={lbl}>Tarifas de envío excluidas</label>
                    <input value={discountForm.excludedRates}
                      onChange={e => setDiscountForm(f => f ? { ...f, excludedRates: e.target.value } : f)}
                      placeholder="ej: Express, Internacional"
                      className={inp}
                    />
                  </div>
                )}

                {/* Usos máximos */}
                <div>
                  <label className={lbl}>Usos máximos</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={discountForm.limitTotal}
                        onChange={e => setDiscountForm(f => f ? { ...f, limitTotal: e.target.checked } : f)}
                      />
                      Limitar número total de usos
                    </label>
                    {discountForm.limitTotal && (
                      <input type="number" value={discountForm.totalLimit}
                        onChange={e => setDiscountForm(f => f ? { ...f, totalLimit: e.target.value } : f)}
                        placeholder="Número máximo de usos"
                        className={`${inp} ml-5`}
                      />
                    )}
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={discountForm.limitPerCustomer}
                        onChange={e => setDiscountForm(f => f ? { ...f, limitPerCustomer: e.target.checked } : f)}
                      />
                      Limitar a un uso por cliente
                    </label>
                  </div>
                </div>

                {/* Combinaciones */}
                <div>
                  <label className={lbl}>Combinaciones</label>
                  <div className="space-y-2">
                    {([
                      { k: 'combineProduct' as const, l: 'Descuentos de producto' },
                      { k: 'combineOrder'   as const, l: 'Descuentos de pedido' },
                      { k: 'combineShipping'as const, l: 'Descuentos de envío' },
                    ]).map(({ k, l }) => (
                      <label key={k} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={discountForm[k]}
                          onChange={e => setDiscountForm(f => f ? { ...f, [k]: e.target.checked } : f)}
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fechas */}
                <div>
                  <label className={lbl}><Calendar size={12} className="inline mr-1" />Fecha de inicio</label>
                  <div className="flex gap-2">
                    <input type="date" value={discountForm.startDate}
                      onChange={e => setDiscountForm(f => f ? { ...f, startDate: e.target.value } : f)}
                      className={`${inp} flex-1`}
                    />
                    <input type="time" value={discountForm.startTime}
                      onChange={e => setDiscountForm(f => f ? { ...f, startTime: e.target.value } : f)}
                      className={`${inp} w-32`}
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={discountForm.hasEndDate}
                      onChange={e => setDiscountForm(f => f ? { ...f, hasEndDate: e.target.checked } : f)}
                    />
                    Fecha de fin
                  </label>
                  {discountForm.hasEndDate && (
                    <div className="flex gap-2">
                      <input type="date" value={discountForm.endDate}
                        onChange={e => setDiscountForm(f => f ? { ...f, endDate: e.target.value } : f)}
                        className={`${inp} flex-1`}
                      />
                      <input type="time" value={discountForm.endTime}
                        onChange={e => setDiscountForm(f => f ? { ...f, endTime: e.target.value } : f)}
                        className={`${inp} w-32`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: preview */}
              <div className="w-56 flex-shrink-0 bg-gray-50 border-l border-gray-100 p-5 rounded-r-2xl">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Resumen</p>
                <div className="space-y-2 text-xs text-gray-700">
                  {discountForm.type !== 'free_shipping' && discountForm.code && (
                    <div><span className="font-semibold">Código:</span> <code className="font-mono bg-white border border-gray-200 px-1 rounded">{discountForm.code}</code></div>
                  )}
                  {discountForm.type !== 'free_shipping' && discountForm.type !== 'buy_x_get_y' && discountForm.value && (
                    <div><span className="font-semibold">Valor:</span> {discountForm.valueType === 'percent' ? `${discountForm.value}% de descuento` : `S/.${discountForm.value} de descuento`}</div>
                  )}
                  {discountForm.type === 'buy_x_get_y' && (
                    <div><span className="font-semibold">Compra:</span> {discountForm.minQty || '?'} unidades → obtiene {discountForm.freeProduct || '?'} gratis</div>
                  )}
                  {discountForm.type === 'free_shipping' && (
                    <div><span className="font-semibold">Tipo:</span> Envío gratis</div>
                  )}
                  <div><span className="font-semibold">Aplica a:</span> {discountForm.appliesTo === 'all_products' ? 'Todos los productos' : discountForm.appliesTo === 'collections' ? 'Colecciones' : 'Productos específicos'}</div>
                  {discountForm.minRequirement !== 'none' && (
                    <div><span className="font-semibold">Min:</span> {discountForm.minRequirement === 'amount' ? `S/.${discountForm.minValue}` : `${discountForm.minValue} artículos`}</div>
                  )}
                  <div><span className="font-semibold">Inicio:</span> {discountForm.startDate} {discountForm.startTime}</div>
                  {discountForm.hasEndDate && discountForm.endDate && (
                    <div><span className="font-semibold">Fin:</span> {discountForm.endDate} {discountForm.endTime}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setDiscountForm(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!discountForm) return
                  const d = { ...discountForm }
                  if (!d.id) d.id = Math.random().toString(36).slice(2)
                  setDiscounts(prev => {
                    const exists = prev.find(x => x.id === d.id)
                    return exists ? prev.map(x => x.id === d.id ? d : x) : [...prev, d]
                  })
                  setDiscountForm(null)
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Guardar descuento
              </button>
            </div>
          </div>
        </div>
      )}
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
