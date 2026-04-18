-- Migration 004: Contact prescriptions and appointments tables
-- Run in: Supabase SQL Editor → New Query

CREATE TABLE IF NOT EXISTS contact_prescriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  doctor          TEXT,
  fecha           DATE,
  tipo            TEXT,
  vision_lejos    JSONB,
  vision_cerca    JSONB,
  vision_intermedia JSONB,
  historia_clinica JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_appointments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  fecha       DATE,
  hora        TIME,
  tipo        TEXT,
  doctor      TEXT,
  notas       TEXT,
  status      TEXT DEFAULT 'pendiente',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_contact ON contact_prescriptions(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact ON contact_appointments(contact_id);

ALTER TABLE contact_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_appointments  ENABLE ROW LEVEL SECURITY;
