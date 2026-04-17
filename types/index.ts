// ─── TENANT ──────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  email: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  widget_token: string
  wa_phone_number?: string
  wa_token?: string
  tone: 'amigable' | 'formal' | 'tecnico'
  avatar_name: string
  config: TenantConfig
  created_at: string
}

export interface TenantConfig {
  primary_color?: string      // default: #2563EB
  secondary_color?: string    // default: #38BDF8
  welcome_message?: string
  business_description?: string
  business_hours?: string
  logo_url?: string
  categories?: string[]       // categorías prioritarias
  checkout_url?: string       // URL de checkout Shopify
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
