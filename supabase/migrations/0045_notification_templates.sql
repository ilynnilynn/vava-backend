-- ============================================================
-- MIGRATION 0045 — notification_templates table
-- Configurable notification message templates.
-- Admins can update templates without code deploys.
-- ============================================================

CREATE TABLE notification_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text NOT NULL,               -- e.g. 'booking_confirmed', 'booking_reminder'
  channel     text NOT NULL DEFAULT 'push', -- 'push', 'in_app'
  title_zh    text NOT NULL,               -- template title (used for push/in-app)
  body_zh     text NOT NULL,               -- template body with {{variable}} placeholders
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Unique on type + channel combo
CREATE UNIQUE INDEX notification_templates_type_channel_idx
  ON notification_templates (type, channel);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates (via admin client / service role)
-- No user-facing RLS policies needed

-- Seed default templates
INSERT INTO notification_templates (type, channel, title_zh, body_zh) VALUES
  ('booking_confirmed', 'push', '預約確認 ✅', '{{dateTime}} — {{serviceSummary}}（{{proDisplayName}}）'),
  ('booking_confirmed', 'in_app', '預約已確認', '{{dateTime}} — {{serviceSummary}}\n設計師：{{proDisplayName}}'),
  ('booking_confirmed_pro', 'push', '新預約通知', '{{dateTime}} — {{serviceSummary}}\n客戶：{{customerName}}'),
  ('booking_confirmed_pro', 'in_app', '新預約通知', '{{dateTime}} — {{serviceSummary}}\n客戶：{{customerName}}'),
  ('booking_reminder', 'push', '預約即將開始 ⏰', '10 分鐘後開始（{{proDisplayName}}）\n📍 {{studioAddress}}'),
  ('booking_reminder', 'in_app', '預約即將開始', '10 分鐘後開始（{{proDisplayName}}）\n📍 {{studioAddress}}'),
  ('booking_reminder_1hr', 'push', '預約提醒 ⏰', '您的預約將在 1 小時後開始（{{proDisplayName}}）'),
  ('booking_reminder_1hr', 'in_app', '預約提醒', '您的預約將在 1 小時後開始（{{proDisplayName}}）\n💅 {{serviceSummary}}'),
  ('booking_cancelled', 'push', '預約已取消', '客戶已取消預約，該時段已重新開放。'),
  ('booking_cancelled', 'in_app', '預約已取消', '客戶已取消預約，該時段已重新開放。'),
  ('review_prompt', 'push', '服務已完成 💅', '請為 {{proDisplayName}} 留下評價'),
  ('review_prompt', 'in_app', '請留下評價', '感謝您使用 VAVA！請為 {{proDisplayName}} 留下評價。'),
  ('pro_approved', 'push', '設計師申請已通過 🎉', '恭喜！您的 VAVA 設計師帳號已通過審核。'),
  ('pro_approved', 'in_app', '設計師申請已通過', '恭喜！您的 VAVA 設計師帳號已通過審核。立即前往後台開放時段，開始接受預約。');
