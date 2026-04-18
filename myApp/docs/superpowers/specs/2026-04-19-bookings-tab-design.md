# Bookings Tab — Design Spec

**Date:** 2026-04-19
**Scope:** Customer-facing bookings list + booking detail screen in the Expo mobile app

---

## Overview

The Bookings tab shows all of a customer's bookings split into two sections: upcoming and history. Tapping a booking opens a detail screen with status-dependent actions.

---

## 1. Bookings List Screen

**Route:** `app/(tabs)/bookings.tsx`

### Layout

- `SectionList` with two sections, pull-to-refresh, virtualized rendering
- Page header: "我的預約" with safe area inset
- Floating tab bar visible at bottom (inherited from tabs layout)

### Sections

| Section | Header | Filter | Sort |
|---------|--------|--------|------|
| 即將到來 | Sticky | `status IN ('confirmed', 'reschedule_pending')` AND `starts_at > now` | Soonest first (ascending) |
| 歷史紀錄 | Sticky | All other bookings (`completed`, `cancelled_*`, `no_show_*`, `rescheduled`, `expired`, or past `confirmed`) | Newest first (descending) |

### Empty State

When the customer has zero bookings:

- Centered illustration (placeholder icon: `calendar-xmark` from FontAwesome6)
- Text: "還沒有預約紀錄"
- CTA button: "開始預約" — opens booking flow (`router.push('/book/category')`)
- Button style: pill, dark background (`#1F2723`), white text, matching home screen CTA

### Section-Level Empty

- If 即將到來 has zero items: hide the section entirely (don't show an empty header)
- If 歷史紀錄 has zero items: hide the section entirely

### Loading State

- Centered spinner while fetching

### Error State

- Centered error message + "重試" button that re-fetches

---

## 2. Booking Card

Each booking renders as a card in the list.

### Content (Minimal)

| Field | Source | Example |
|-------|--------|---------|
| Pro name | `booking.pro_display_name` (joined) | Mia |
| Service type | Domain derived from `booking.service_category_ids` → category → `domain` | 美甲 |
| Date + time | `formatBookingDate(starts_at)` + `formatSlotTime(starts_at)` | 4月21日 (一) 14:00 |
| Status badge | `booking.status` mapped to label + color | 已確認 |

### Status Badge Mapping

| Status | Label | Badge Color | Text Color |
|--------|-------|-------------|------------|
| `confirmed` | 已確認 | `#E8F5E9` | `#2E7D52` |
| `reschedule_pending` | 改期中 | `#FFF8E1` | `#F57F17` |
| `completed` | 已完成 | `#EAEAE4` | `#808868` |
| `cancelled_grace` | 已取消 | `#FFEBEE` | `#C62828` |
| `cancelled_customer` | 已取消 | `#FFEBEE` | `#C62828` |
| `cancelled_pro` | 已取消 | `#FFEBEE` | `#C62828` |
| `no_show_customer` | 未到場 | `#FFEBEE` | `#C62828` |
| `no_show_pro` | 設計師未到 | `#FFEBEE` | `#C62828` |
| `rescheduled` | 已改期 | `#EAEAE4` | `#808868` |
| `expired` | 已過期 | `#EAEAE4` | `#808868` |

### Card Style

- `backgroundColor`: `#F0EDE5`
- `borderRadius`: 12
- `padding`: 16
- `gap`: 8 between elements
- Pro name: `fontSize` 16, `fontWeight` 700, color `#1F2723`
- Service + date: `fontSize` 14, color `#808868`
- Badge: `fontSize` 12, `borderRadius` 9999, `paddingHorizontal` 8, `paddingVertical` 2

### Tap Action

Navigates to `/(tabs)/booking/[id]` with `bookingId` param.

---

## 3. Booking Detail Screen

**Route:** `app/(tabs)/booking/[id].tsx`

### Content

- Pro name (bold, large)
- Service summary (category label + style if present)
- Date + time
- Studio address
- Status badge (same mapping as card)
- Price range: "NT$min–max"

### Status-Dependent Actions

#### Confirmed (upcoming, before day-of)

- "編輯預約" button opens action options:
  - **取消預約**: Cancel with flag consequence warning per timing rules (grace / soft / hard)
  - **改期**: Only available if session > 2hr away. Opens reschedule flow (future scope — show disabled with tooltip for now)

#### Confirmed (day-of)

All of the above, plus:

| Timing | Action |
|--------|--------|
| `starts_at - 10min` | Pro phone number revealed |
| `starts_at - 10min` | "我會晚到" button appears — sets `customer_late_notified_at` via API |
| `starts_at + no_show_window_minutes` | "設計師未到場" button activates — sets `no_show_pro` via API |

#### Completed

- If not yet rated: "評分" CTA linking to rating flow (future scope — show as disabled)
- If rated: show star count

#### Terminal (cancelled, no_show, expired, rescheduled)

- Display-only, no action buttons

---

## 4. Data Flow

### Fetch

```
BookingsScreen mounts
  → apiPost<BookingListItem[]>('/api/bookings/list', {})
  → Returns bookings joined with: pro.display_name, service_category.domain
  → Client splits into upcoming vs history
  → SectionList renders
```

### Type

```ts
type BookingListItem = {
  id: string
  pro_display_name: string
  service_domain: 'nails' | 'lashes'
  starts_at: string
  status: BookingStatus
}
```

### Refresh

- Pull-to-refresh triggers re-fetch
- Screen re-fetches on focus (tab switch) via `useFocusEffect`

### Detail Fetch

```
BookingDetailScreen mounts
  → apiPost<BookingDetail>('/api/bookings/detail', { bookingId })
  → Returns full booking data + pro info
```

```ts
type BookingDetail = {
  id: string
  pro_display_name: string
  pro_phone: string | null        // revealed at starts_at - 10min
  service_domain: 'nails' | 'lashes'
  service_label: string           // e.g. "凝膠・單色"
  starts_at: string
  session_ends_at: string
  studio_address: string
  price_min: number
  price_max: number
  status: BookingStatus
  no_show_window_minutes: number
  customer_late_notified_at: string | null
  created_at: string
}
```

---

## 5. New Files

| File | Purpose |
|------|---------|
| `app/(tabs)/bookings.tsx` | Bookings list screen (replace existing stub) |
| `app/(tabs)/booking/[id].tsx` | Booking detail screen |
| `components/booking/BookingCard.tsx` | Reusable booking card for the list |
| `components/booking/StatusBadge.tsx` | Status label + color pill |

---

## 6. Dependencies

- Existing: `lib/api.ts` (apiPost), `lib/booking-helpers.ts` (formatBookingDate, formatSlotTime), `types/database.ts` (BookingStatus)
- New API endpoints (backend): `/api/bookings/list`, `/api/bookings/detail` — not in scope of this spec, will be built separately
- For MVP: mock data can be used until backend endpoints exist

---

## 7. Out of Scope

- Reschedule flow UI (show button as disabled)
- Rating flow UI (show button as disabled)
- Real-time updates via Supabase Realtime (can be added later)
- Pagination for history section (not needed until scale warrants it)
