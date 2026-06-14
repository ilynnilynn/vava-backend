-- ============================================================
-- MIGRATION 0045 — notification_templates table
-- Configurable notification message templates.
-- Admins can update templates without code deploys.
-- ============================================================

CREATE TABLE notification_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type        text NOT NULL UNIQUE,        -- e.g. 'booking_confirmed', 'booking_reminder'
  channel     text NOT NULL DEFAULT 'line', -- 'line', 'push', 'in_app'
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
  ('booking_confirmed', 'line', '預約確認', '【VAVA 預約確認 ✅】\n您的預約已成功！\n📅 {{dateTime}}\n💅 {{serviceSummary}}\n設計師：{{proDisplayName}}\n\n預約前 10 分鐘將收到地址提醒。'),
  ('booking_confirmed', 'push', '預約確認 ✅', '{{dateTime}} — {{serviceSummary}}（{{proDisplayName}}）'),
  ('booking_confirmed_pro', 'line', '新預約通知', '【VAVA 預約通知】\n📅 {{dateTime}}\n💅 {{serviceSummary}}\n📍 {{studioAddress}}\n客戶：{{customerName}} · {{customerPhone}}'),
  ('booking_reminder', 'line', '預約提醒', '【VAVA 提醒】\n⏰ 您的預約將在 10 分鐘後開始\n設計師：{{proDisplayName}}\n📍 {{studioAddress}}\n📅 {{dateTime}}'),
  ('booking_reminder', 'push', '預約即將開始 ⏰', '10 分鐘後開始（{{proDisplayName}}）\n📍 {{studioAddress}}'),
  ('booking_reminder_1hr', 'line', '預約提醒', '【VAVA 提醒】\n⏰ 您的預約將在 1 小時後開始\n設計師：{{proDisplayName}}\n📅 {{dateTime}}\n💅 {{serviceSummary}}\n\n請提前做好準備！'),
  ('booking_reminder_1hr', 'push', '預約提醒 ⏰', '您的預約將在 1 小時後開始（{{proDisplayName}}）'),
  ('booking_cancelled', 'line', '預約取消', '【VAVA 通知】\n客戶已取消預約，該時段已重新開放。'),
  ('booking_cancelled', 'push', '預約已取消', '客戶已取消預約，該時段已重新開放。'),
  ('review_prompt', 'line', '評價邀請', '【VAVA 預約完成】\n感謝您使用 VAVA 💅\n請為 {{proDisplayName}} 留下評價，幫助其他客戶做選擇 👇\n{{ratingUrl}}'),
  ('review_prompt', 'push', '服務已完成 💅', '請為 {{proDisplayName}} 留下評價'),
  ('pro_approved', 'line', '審核通過', '【VAVA 審核通過 🎉】\n恭喜您！您的 VAVA 設計師帳號已通過審核。\n立即前往後台開放時段，開始接受預約 👇\n{{dashboardUrl}}'),
  ('pro_declined', 'line', '審核通知', '【VAVA 審核通知】\n很遺憾，您的設計師申請未通過。\n原因：{{reasons}}\n\n請修正後重新申請。如有疑問請聯繫客服。');
