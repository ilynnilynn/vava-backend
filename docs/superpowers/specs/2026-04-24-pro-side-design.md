# Pro Side Design — Vava

**Date:** 2026-04-24
**Scope:** Pro dashboard (4 screens) + onboarding (Gmail + Apple ID)
**Status:** Approved

---

## Overview

The Pro side is a parallel in-app experience for beauty professionals using Vava. When a Pro flips the RoleToggle in their Account screen, the app switches to the `(pro-tabs)` route group. All four Pro screens share the same design system, component primitives, and navigation chrome as the customer side.

---

## 1. Navigation Architecture

Parallel route groups in expo-router:

```
app/
├── (tabs)/              ← customer (existing)
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── bookings.tsx
│   └── account.tsx
└── (pro-tabs)/          ← pro (new)
    ├── _layout.tsx
    ├── index.tsx        Pro Home
    ├── slots.tsx        Slot Manager
    ├── bookings.tsx     Bookings (upcoming + history)
    └── account.tsx      Pro Account + Services
```

**Tab bar:** 首頁 · 時段 · 預約 · 帳號
Same `FloatingTabBar` component, different tab config passed as props.

**Mode switching:** `RoleToggle` in Account navigates to `/(pro-tabs)/` when switched to Pro, and `/(tabs)/` when switched back. Both route groups maintain independent navigation state.

---

## 2. Pro Home Screen (`index.tsx`)

Today's confirmed bookings as a flat chronological list.

**Header:**
- Title: "今日預約" (20px bold, #141413)
- Subtitle: today's date (14px, #808868)

**Booking list:**
- Sorted by time ascending
- Component: `BookingCardPro` — extended from `BookingCard`, adds inline action buttons for active sessions

**Card states:**

| Status | Badge | Actions on card |
|---|---|---|
| 待到場 | blue | none |
| 進行中 | green | ✓ 結束服務 (black fill) · 客戶未到場 (red ghost) |
| 已完成 | grey | none |

**Empty state:** "今天沒有預約" centered with muted icon.

**Data:** `bookings` WHERE `pro_id = me` AND `date = today` AND `status IN (confirmed, in_progress, completed)`.

**Not included:** is_accepting toggle (cut from scope).

---

## 3. Slots Screen (`slots.tsx`)

Availability manager for a rolling 72-hour window of 15-minute slots.

**Header:**
- Title: "時段管理" (20px bold)
- Date range: e.g., "週四 4/24 — 週六 4/26" (14px, #808868)

**Day tabs:** 今天 · 明天 · 後天 (with date labels)
- Active tab: underline indicator, #141413
- Switching tabs jumps to that day's section in the list

**Slot rows:** `[time label 36px] [slot pill flex:1]`

**Slot states:**

| State | Visual | Tap action |
|---|---|---|
| 過期 | grey fill, muted text | none (locked) |
| 可開放 | white + grey border, "+ 點擊開放" | opens slot |
| 開放中 | purple fill (#ede9fe/#7c3aed), "開放中 · 移除" | removes slot |
| 已預約 | green fill (#dcfce7/#15803d), "已預約 🔒" | none (locked) |

Single tap toggles open ↔ closed. No confirm dialog.

**Data:** reads/writes `availability_slots` WHERE `pro_id = me` AND `starts_at` within next 72hrs.

---

## 4. Bookings Screen (`bookings.tsx`)

Upcoming and past appointments. Two-tab layout matching customer bookings page.

**Tabs:** 即將到來 · 歷史紀錄
Active tab underline: #F9583B (matches customer tab style)

**即將到來 (Upcoming):**
- Confirmed bookings from tomorrow onwards (today handled by Home)
- Status badge: 待到場
- No action buttons — actions only on Home for active sessions

**歷史紀錄 (Past):**
- Completed + no-show bookings
- Status badge: 已完成 or 客戶未到場
- Read-only

**Empty states:**
- Upcoming: "目前沒有即將到來的預約"
- History: "還沒有歷史紀錄"

**Data:**
- Upcoming: `status = confirmed` AND `date > today`
- History: `status IN (completed, no_show)` AND `pro_id = me`

---

## 5. Pro Account Screen (`account.tsx`)

Mirrors customer Account structure. Reuses `ProfileHeader` and `RoleToggle` unchanged.

**Settings groups:**

| Group | Items |
|---|---|
| 我的服務 | 服務項目管理 |
| 營業設定 | 預約設定 · 休假設定 |
| 帳號 | 個人資料 · 通知設定 |
| 支援 | 幫助中心 · 聯絡我們 |
| — | 登出 (no icon, red text) |

### Services Screen (navigated from 我的服務 → 服務項目管理)

- List of services: name, duration, price
- Add / Edit / Delete actions
- Each service maps to a `services` table row linked to `pro_id`

---

## 6. Onboarding

Triggered on first Pro login.

**Auth methods:** Gmail (Google OAuth) + Apple ID
**Implementation:** `expo-auth-session` + Supabase OAuth providers
**LINE:** excluded from scope

**Onboarding flow (post-auth):**
1. Set display name + profile photo (optional)
2. Add at least one service (name, duration, price)
3. Land on Pro Home

Short, 2-step setup. No complex wizard.

---

## 7. Shared Components

| Component | Reuse strategy |
|---|---|
| `ProfileHeader` | Reused as-is |
| `RoleToggle` | Reused as-is |
| `SettingsRow` | Reused as-is |
| `FloatingTabBar` | Reused, different tab config |
| `BookingCard` | Extended to `BookingCardPro` with action buttons |
| `ModeSwitch` | Reused as-is |

---

## 8. Data Access Summary

| Screen | Table(s) | Filter |
|---|---|---|
| Pro Home | `bookings` | `pro_id = me`, `date = today` |
| Slots | `availability_slots` | `pro_id = me`, next 72hrs |
| Bookings (upcoming) | `bookings` | `pro_id = me`, `date > today`, `status = confirmed` |
| Bookings (history) | `bookings` | `pro_id = me`, `status IN (completed, no_show)` |
| Account / Services | `pros`, `services` | `pro_id = me` |

RLS: all queries scoped to authenticated `pro_id`. Pros cannot read other pros' data.

---

## Out of Scope

- Real-time push notifications (future)
- Earnings / payout dashboard (future)
- LINE auth (cut)
- is_accepting toggle on Home (cut)
- In-app messaging with clients (future)
