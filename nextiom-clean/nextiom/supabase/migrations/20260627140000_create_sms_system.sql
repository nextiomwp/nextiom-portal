-- ─────────────────────────────────────────────
--  SMS System – Database Schema
--  Created: 2026-06-27
-- ─────────────────────────────────────────────

-- SMS Settings table (single-row config, like invoice_settings)
CREATE TABLE IF NOT EXISTS sms_settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_token        TEXT             DEFAULT '',           -- Text.lk Bearer token
  sender_id        TEXT             DEFAULT 'Nextiom',   -- Optional sender ID / SMS header
  sms_enabled      BOOLEAN          DEFAULT false,        -- Master on/off switch
  login_otp        BOOLEAN          DEFAULT false,        -- Send OTP on login
  always_otp       BOOLEAN          DEFAULT false,        -- Require OTP every login
  renewal_reminder BOOLEAN          DEFAULT true,         -- Send renewal reminders
  purchase_sms     BOOLEAN          DEFAULT true,         -- Send purchase thank-you SMS
  reminder_days    INTEGER          DEFAULT 3,            -- Days before expiry to send reminder
  created_at       TIMESTAMPTZ      DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      DEFAULT NOW()
);

-- Insert the default row (there is always exactly one row)
INSERT INTO sms_settings (id, sms_enabled, login_otp, always_otp, renewal_reminder, purchase_sms, reminder_days)
VALUES (gen_random_uuid(), false, false, false, true, true, 3)
ON CONFLICT DO NOTHING;

-- SMS Logs table – immutable audit trail
CREATE TABLE IF NOT EXISTS sms_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone        TEXT         NOT NULL,
  message      TEXT         NOT NULL,
  type         TEXT         NOT NULL,   -- 'renewal_reminder' | 'purchase' | 'otp' | 'manual'
  status       TEXT         NOT NULL,   -- 'sent' | 'failed'
  provider_ref TEXT,                    -- provider message id returned by Text.lk
  error_msg    TEXT,
  sent_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs     ENABLE ROW LEVEL SECURITY;

-- sms_settings: only admins can read/write
-- Use auth.jwt() to read app_metadata from the JWT claim directly,
-- which avoids a subquery on auth.users (which the authenticated role cannot read).
CREATE POLICY "Admin read sms_settings"
  ON sms_settings FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admin write sms_settings"
  ON sms_settings FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin')
  WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin');

-- sms_logs: only admins can read; edge functions insert via service role (bypasses RLS)
CREATE POLICY "Admin read sms_logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin');
