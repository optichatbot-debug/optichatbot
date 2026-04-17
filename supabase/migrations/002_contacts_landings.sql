-- ============================================================
-- OPTICHATBOT — Migration 002
-- Nuevas tablas: contacts, landings
-- Ejecutar en: Supabase SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLA: contacts
-- Contactos de WhatsApp/web por tenant (creados manualmente o
-- capturados desde conversaciones)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT '',
  phone          TEXT,
  email          TEXT,
  label          TEXT DEFAULT 'Sin etiqueta',
  channel        TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','web','instagram','messenger')),
  subscribed     BOOLEAN NOT NULL DEFAULT true,
  notes          TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}',
  subscribed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant    ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone     ON contacts(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_contacts_label     ON contacts(tenant_id, label);
CREATE INDEX IF NOT EXISTS idx_contacts_channel   ON contacts(tenant_id, channel);

CREATE OR REPLACE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Solo el service_role (backend) escribe. Lectura pública desactivada.
-- Las policies de usuario autenticado se agregan en Fase auth completa.

-- ─────────────────────────────────────────────────────────────
-- TABLA: landings
-- Landing pages generadas con IA para cada tenant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS landings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Landing sin nombre',
  prompt        TEXT NOT NULL DEFAULT '',
  html_content  TEXT NOT NULL DEFAULT '',
  published     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landings_tenant ON landings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_landings_date   ON landings(created_at DESC);

CREATE OR REPLACE TRIGGER trg_landings_updated_at
  BEFORE UPDATE ON landings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE landings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT 'contacts' as tabla, COUNT(*) as filas FROM contacts
UNION ALL
SELECT 'landings', COUNT(*) FROM landings;
