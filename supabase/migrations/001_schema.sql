-- ============================================================
-- OPTICHATBOT — Migration 001
-- Schema completo: tablas, RLS, funciones, datos de prueba
-- Ejecutar en: Supabase SQL Editor → New Query
-- ============================================================

-- Habilitar extensión pgvector para embeddings RAG
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLA: tenants
-- Cada negocio registrado en la plataforma
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  plan                TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro','enterprise')),
  widget_token        UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  wa_phone_number     TEXT,
  wa_phone_number_id  TEXT,
  wa_token            TEXT,
  tone                TEXT NOT NULL DEFAULT 'amigable' CHECK (tone IN ('amigable','formal','tecnico')),
  avatar_name         TEXT NOT NULL DEFAULT 'Ojito',
  config              JSONB NOT NULL DEFAULT '{}',
  stripe_customer_id  TEXT,
  stripe_subscription_id TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLA: products
-- Catálogo de productos por tenant (manual, Shopify o PDF)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  sku         TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','shopify','pdf')),
  shopify_id  TEXT,
  embedding   vector(1536),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(tenant_id, category);
-- Índice para búsqueda vectorial (RAG)
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────
-- TABLA: conversations
-- Historial de chats. Una fila por sesión.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id   TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web','whatsapp','messenger')),
  messages     JSONB NOT NULL DEFAULT '[]',
  tone         TEXT NOT NULL DEFAULT 'amigable',
  prescription JSONB,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(tenant_id, channel);

-- ─────────────────────────────────────────────────────────────
-- TABLA: flows
-- Flujos de respuesta encadenada tipo ManyChat
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flows (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL DEFAULT 'Flujo sin nombre',
  trigger_keywords TEXT[] NOT NULL DEFAULT '{}',
  steps            JSONB NOT NULL DEFAULT '[]',
  active           BOOLEAN NOT NULL DEFAULT true,
  priority         INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flows_tenant ON flows(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- TABLA: promotions
-- Promociones activas por tenant y categoría
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'General',
  discount_type  TEXT NOT NULL DEFAULT 'pct' CHECK (discount_type IN ('pct','fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  message        TEXT NOT NULL DEFAULT '',
  active         BOOLEAN NOT NULL DEFAULT true,
  valid_until    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_tenant ON promotions(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- TABLA: prescriptions
-- Prescripciones ópticas capturadas por el chatbot
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  od          JSONB,
  oi          JSONB,
  add_power   NUMERIC(5,2),
  dnp         NUMERIC(5,2),
  height      NUMERIC(5,2),
  notes       TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- TABLA: analytics
-- Eventos de uso por tenant (para métricas del dashboard)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel    TEXT NOT NULL DEFAULT 'web',
  payload    JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- FUNCIÓN: updated_at automático
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- FUNCIÓN: match_products (búsqueda semántica RAG con pgvector)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_products (
  query_embedding    vector(1536),
  match_tenant_id    UUID,
  match_threshold    FLOAT DEFAULT 0.5,
  match_count        INT DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  category    TEXT,
  price       NUMERIC,
  description TEXT,
  image_url   TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.category,
    p.price,
    p.description,
    p.image_url,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE
    p.tenant_id = match_tenant_id
    AND p.active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Aislamiento total entre tenants
-- ─────────────────────────────────────────────────────────────

ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics     ENABLE ROW LEVEL SECURITY;

-- Service role bypassa RLS (para el backend)
-- Las policies son para acceso desde el cliente (anon/auth)

-- tenants: cada tenant solo ve su fila
CREATE POLICY "tenant_select_own" ON tenants
  FOR SELECT USING (auth.uid()::text = id::text);

-- products: lectura pública por widget_token (via función RPC)
-- escritura solo desde service_role (backend)
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (active = true);

-- conversations: solo service_role accede (backend)
-- No necesitan policy de anon

-- Para el dashboard autenticado, las policies se agregan en Fase 2
-- cuando implementemos Supabase Auth

-- ─────────────────────────────────────────────────────────────
-- DATOS DE PRUEBA: Tenant demo (Tyler & Max Eyewear)
-- ─────────────────────────────────────────────────────────────
INSERT INTO tenants (
  id,
  name,
  email,
  plan,
  widget_token,
  tone,
  avatar_name,
  config
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Tyler & Max Eyewear',
  'demo@tylerandmaxeyewear.com',
  'pro',
  'demo-token-tyler-max-2026',
  'amigable',
  'Ojito',
  '{
    "primary_color": "#2563EB",
    "business_description": "óptica especializada en lentes de moda y lentes con medida",
    "checkout_url": "https://tylerandmaxeyewear.com/cart",
    "categories": ["Opticos", "Sol", "Deportivos", "Infantiles"]
  }'
) ON CONFLICT (email) DO NOTHING;

-- Productos de prueba para Tyler & Max
INSERT INTO products (tenant_id, name, category, price, description, source) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Armazón Óptico Clásico Negro', 'Opticos', 89.90, 'Armazón de acetato negro, forma rectangular, unisex. Ideal para uso diario con medida.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lentes de Sol Piloto Dorado', 'Sol', 129.90, 'Estilo aviador, montura dorada, lentes espejo azul. UV400. Perfecto para cara ovalada y corazón.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Armazón Cat Eye Rosa', 'Opticos', 109.90, 'Forma cat eye, acetato rosa pastel. Ideal para rostro ovalado o redondo. Muy de moda.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lentes de Sol Cuadrados Carey', 'Sol', 99.90, 'Montura cuadrada, diseño carey (marrón), lentes degradé. Unisex. UV400.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Armazón Óptico Redondo Plateado', 'Opticos', 79.90, 'Montura metálica plateada, forma circular. Estilo retro. Para cara cuadrada o rectangular.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lentes Deportivos Wrap', 'Deportivos', 149.90, 'Montura wrap, TR90 flexible e irrompible. Ideal para deporte y actividades al aire libre.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Armazón Infantil Azul', 'Infantiles', 69.90, 'Para niños 4-10 años. Montura TR90 flexible, color azul, con protección UV.', 'manual'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lentes Progresivos Premium', 'Opticos', 299.90, 'Lunas progresivas de alta definición con tratamiento antirreflejo incluido. Adaptación fácil.', 'manual')
ON CONFLICT DO NOTHING;

-- Promoción de prueba
INSERT INTO promotions (tenant_id, name, category, discount_type, discount_value, message) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Descuento Ópticos 15%', 'Opticos', 'pct', 15, '¡Tenemos 15% de descuento en todos nuestros armazones ópticos! Válido al llevar tu receta médica.')
ON CONFLICT DO NOTHING;

-- Flujo de bienvenida de prueba
INSERT INTO flows (tenant_id, name, trigger_keywords, steps, priority) VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Flujo de Horarios',
    ARRAY['horario', 'hora', 'atención', 'abierto', 'cuando abren'],
    '[
      {
        "id": "step1",
        "type": "message",
        "content": "Nuestro horario de atención es: Lunes a Viernes de 9am a 7pm, Sábados de 9am a 2pm. Domingos cerrado. ¿Te puedo ayudar con algo más? 😊"
      }
    ]',
    10
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────
SELECT 'tenants' as tabla, COUNT(*) as filas FROM tenants
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'flows', COUNT(*) FROM flows
UNION ALL
SELECT 'promotions', COUNT(*) FROM promotions;
