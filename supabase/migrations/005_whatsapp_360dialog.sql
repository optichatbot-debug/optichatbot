-- Task 5: Add 360dialog and WhatsApp connection columns to tenants

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wa_360dialog_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wa_connected BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wa_phone_number_id TEXT;
