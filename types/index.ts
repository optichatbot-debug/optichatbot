// ─── TENANT ──────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  email: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  widget_token: string
  wa_phone_number?: string
  wa_phone_number_id?: string
  wa_token?: string
  wa_360dialog_key?: string
  wa_connected?: boolean
  tone: 'amigable' | 'formal' | 'tecnico'
  avatar_name: string
  config: TenantConfig
  created_at: string
}

export interface TenantConfig {
  // Legacy
  primary_color?: string
  secondary_color?: string
  business_hours?: string
  logo_url?: string
  categories?: string[]
  checkout_url?: string
  // Section 0 — Info básica
  seller_name?: string
  seller_gender?: string
  company_name?: string
  country?: string
  business_description?: string
  audience?: string
  instrucciones_especiales?: string
  // Section 1 — Personalidad
  ai_rules?: string
  communication_style?: string
  sales_style?: string
  response_length?: string
  use_emojis?: boolean
  use_opening_signs?: boolean
  forbidden_words?: string[]
  emoji_palette?: string
  // Section 2 — Mensajes
  welcome_message?: string
  purchase_confirm_message?: string
  human_handoff_message?: string
  // Section 3 — FAQs
  faqs?: Array<{ id: string; question: string; answer: string; category: string }>
  // Section 4 — Horarios
  always_on?: boolean
  schedule?: Record<string, { active: boolean; from: string; to: string }>
  outside_hours_message?: string
  // Section 5 — Promociones
  ai_promotions?: Array<{ id: string; name: string; desc: string; conditions: string; discount: string }>
  // Section 6 — Envíos
  shipping?: {
    zone_name?: string
    payment_types?: string
    cash_on_delivery?: boolean
    partial_payment?: boolean
    partial_amount?: string
    zones?: Array<{ id: string; name: string; price: string; desc: string }>
  }
  // Section 7 — Pagos
  payment_methods?: Array<{
    id: string; name: string; selected: boolean; tipo: string
    nombre_entidad: string; instructions: string
  }>
  // Section 8 — Descuentos
  discounts?: Array<Record<string, unknown>>
  // Section 9-11
  claims_instructions?: string
  returns_policy?: string
  other_info?: string
}

// ─── PRODUCT ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string
  tenant_id: string
  name: string
  category: string
  price: number
  description: string
  image_url?: string
  sku?: string
  source: 'manual' | 'shopify' | 'pdf'
  active: boolean
  created_at: string
  // solo en queries con similaridad
  similarity?: number
}

// ─── CONVERSATION ─────────────────────────────────────────────────────────────
export interface Conversation {
  id: string
  tenant_id: string
  session_id: string
  channel: 'web' | 'whatsapp' | 'messenger'
  messages: ChatMessage[]
  tone: 'amigable' | 'formal' | 'tecnico'
  prescription?: Prescription
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── PRESCRIPTION ─────────────────────────────────────────────────────────────
export interface Prescription {
  od?: EyeData   // Ojo Derecho
  oi?: EyeData   // Ojo Izquierdo
  add?: number   // Adición (bifocal/progresivo)
  dnp?: number   // Distancia naso-pupilar
  height?: number
  captured_at?: string
}

export interface EyeData {
  sphere?: number    // Esfera
  cylinder?: number  // Cilindro
  axis?: number      // Eje
}

// ─── FLOW ────────────────────────────────────────────────────────────────────
export interface Flow {
  id: string
  tenant_id: string
  name: string
  trigger_keywords: string[]
  steps: FlowStep[]
  active: boolean
  priority: number
  created_at: string
  updated_at?: string
}

export interface FlowStep {
  id: string
  type: 'message' | 'question' | 'redirect' | 'collect_prescription'
  content: string
  options?: string[]
  next_step_id?: string
  condition?: Record<string, string>
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────
export interface Contact {
  id: string
  tenant_id: string
  name: string
  phone?: string
  email?: string
  label: string
  channel: 'whatsapp' | 'web' | 'instagram' | 'messenger'
  subscribed: boolean
  notes?: string
  metadata: Record<string, unknown>
  subscribed_at: string
  created_at: string
  updated_at: string
}

// ─── LANDING ─────────────────────────────────────────────────────────────────
export interface Landing {
  id: string
  tenant_id: string
  name: string
  prompt: string
  html_content: string
  published: boolean
  created_at: string
  updated_at: string
}

// ─── PROMOTION ───────────────────────────────────────────────────────────────
export interface Promotion {
  id: string
  tenant_id: string
  name: string
  category: string
  discount_type: 'pct' | 'fixed'
  discount_value: number
  message: string
  active: boolean
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
export interface AnalyticsEvent {
  tenant_id: string
  event_type: 'chat_started' | 'product_recommended' | 'prescription_captured' | 'sale_closed' | 'whatsapp_message'
  channel: 'web' | 'whatsapp' | 'messenger'
  payload: Record<string, any>
}

// ─── API TYPES ────────────────────────────────────────────────────────────────
export interface ChatRequest {
  message: string
  session_id: string
  tenant_token: string
  channel?: 'web' | 'whatsapp' | 'messenger'
  tone_override?: 'amigable' | 'formal' | 'tecnico'
}

export interface ChatResponse {
  reply: string
  session_id: string
  suggested_products?: Product[]
  prescription_detected?: boolean
  flow_triggered?: string
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
export interface WhatsAppWebhookBody {
  object: string
  entry: WhatsAppEntry[]
}

export interface WhatsAppEntry {
  id: string
  changes: WhatsAppChange[]
}

export interface WhatsAppChange {
  value: {
    messaging_product: string
    metadata: { phone_number_id: string }
    messages?: WhatsAppMessage[]
  }
  field: string
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  text?: { body: string }
  type: string
}
