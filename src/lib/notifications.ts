// ============================================================
// NOTIFICATIONS — all LINE Messaging API sends
//
// Rule: all LINE message sends go through this file.
// Never call the LINE API directly from components or routes.
//
// Setup: set LINE_CHANNEL_ACCESS_TOKEN in .env.local
// LINE Messaging API docs: https://developers.line.biz/en/docs/messaging-api/
// ============================================================

const LINE_PUSH_URL    = 'https://api.line.me/v2/bot/message/push'
const ACCESS_TOKEN     = process.env.LINE_CHANNEL_ACCESS_TOKEN

// ── Core send ────────────────────────────────────────────────

// Low-level push to a single LINE user ID.
// lineUserId = the user's LINE UID (stored in users.line_user_id or pros.line_user_id)
async function push(lineUserId: string, messages: object[]): Promise<void> {
  if (!ACCESS_TOKEN) {
    // In dev without a LINE account set up — log and skip
    console.warn('[notifications] LINE_CHANNEL_ACCESS_TOKEN not set — skipping send to', lineUserId)
    console.debug('[notifications] Would have sent:', JSON.stringify(messages, null, 2))
    return
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[notifications] LINE API error:', res.status, body)
  }
}

function text(message: string) {
  return { type: 'text', text: message }
}

// ── Booking confirmed → pro ───────────────────────────────────

// Sent immediately after confirmBooking(). No opt-out button — listed slot = commitment.
export async function notifyProBookingConfirmed(params: {
  proLineUserId: string
  customerName: string
  customerPhone: string        // revealed to pro on confirm
  dateTime: string             // formatted: "3月17日 14:30"
  serviceSummary: string       // e.g. "凝膠 · 貓眼"
  studioAddress: string        // reminder of their own address
  styleTagsSummary?: string    // e.g. "狐系、仙女款"
  refPhotoUrl?: string | null
  preferences?: string[]       // e.g. ['寧靜服務']
  customerNote?: string | null
}): Promise<void> {
  const lines = [
    '【VAVA 預約通知】',
    `📅 ${params.dateTime}`,
    `💅 ${params.serviceSummary}`,
    `📍 ${params.studioAddress}`,
    `客戶：${params.customerName} · ${params.customerPhone}`,
  ]

  if (params.styleTagsSummary)    lines.push(`風格備註：${params.styleTagsSummary}`)
  if (params.preferences?.length) lines.push(`偏好：${params.preferences.join('、')}`)
  if (params.customerNote)        lines.push(`客戶備註：${params.customerNote}`)

  lines.push('')
  lines.push('如有緊急狀況無法接受，請聯繫 VAVA 客服。')

  await push(params.proLineUserId, [text(lines.join('\n'))])
}

// ── Reminder → customer (-10 min) ────────────────────────────

export async function notifyCustomerReminder(params: {
  customerLineUserId: string
  proDisplayName: string
  dateTime: string        // "14:30"
  studioAddress: string   // revealed at session time
}): Promise<void> {
  await push(params.customerLineUserId, [text(
    `【VAVA 提醒】\n⏰ 您的預約將在 10 分鐘後開始\n設計師：${params.proDisplayName}\n📍 ${params.studioAddress}\n📅 ${params.dateTime}`
  )])
}

// ── Pro cancels → customer (warm handoff) ────────────────────

export async function notifyCustomerProCancelled(params: {
  customerLineUserId: string
  searchUrl: string   // pre-filtered results URL: same service + same area
}): Promise<void> {
  await push(params.customerLineUserId, [text(
    `【VAVA 通知】\n設計師臨時有緊急狀況，VAVA 已為您找到其他可用的設計師 👇\n${params.searchUrl}`
  )])
}

// ── Customer cancels → pro ────────────────────────────────────

export async function notifyProCustomerCancelled(params: {
  proLineUserId: string
  withinGrace: boolean
}): Promise<void> {
  const msg = params.withinGrace
    ? '【VAVA 通知】\n客戶已在寬限期內取消預約，該時段已重新開放。'
    : '【VAVA 通知】\n客戶已取消預約，該時段已重新開放。'
  await push(params.proLineUserId, [text(msg)])
}

// ── Reschedule → pro (approval request) ──────────────────────

export async function notifyProRescheduleRequested(params: {
  proLineUserId: string
  customerName: string
  originalDateTime: string
  newDateTime: string
  // In MVP — pro responds via VAVA dashboard, not LINE reply
}): Promise<void> {
  await push(params.proLineUserId, [text(
    `【VAVA 更改時間申請】\n客戶：${params.customerName}\n原時間：${params.originalDateTime}\n申請改為：${params.newDateTime}\n\n請至 VAVA 後台回覆，逾 6 小時視為拒絕。`
  )])
}

// ── Reschedule outcome → customer ────────────────────────────

export async function notifyCustomerRescheduleOutcome(params: {
  customerLineUserId: string
  approved: boolean
  newDateTime?: string
}): Promise<void> {
  const msg = params.approved
    ? `【VAVA 通知】\n設計師已接受更改時間申請 ✅\n新時間：${params.newDateTime}`
    : `【VAVA 通知】\n設計師無法接受此次更改時間申請，您的原預約維持不變。`
  await push(params.customerLineUserId, [text(msg)])
}

// ── Pro no-show → customer (warm handoff) ────────────────────

export async function notifyCustomerProNoShow(params: {
  customerLineUserId: string
  searchUrl: string
}): Promise<void> {
  await push(params.customerLineUserId, [text(
    `【VAVA 通知】\n非常抱歉此次預約出現問題。VAVA 正在為您尋找其他可用的設計師 👇\n${params.searchUrl}`
  )])
}

// ── Pro approved ─────────────────────────────────────────────

export async function notifyProApproved(params: {
  proLineUserId: string
  dashboardUrl: string
}): Promise<void> {
  await push(params.proLineUserId, [text(
    `【VAVA 審核通過 🎉】\n恭喜您！您的 VAVA 設計師帳號已通過審核。\n立即前往後台開放時段，開始接受預約 👇\n${params.dashboardUrl}`
  )])
}

// ── Rating prompt → customer (1hr after completed_at) ────────

export async function notifyCustomerRatingPrompt(params: {
  customerLineUserId: string
  proDisplayName: string
  ratingUrl: string
}): Promise<void> {
  await push(params.customerLineUserId, [text(
    `【VAVA 預約完成】\n感謝您使用 VAVA 💅\n請為 ${params.proDisplayName} 留下評價，幫助其他客戶做選擇 👇\n${params.ratingUrl}`
  )])
}
