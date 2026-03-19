# Pro Dashboard

_Dev reference. Source: Session 12 (2026-03-16)._

---

## Overview

6-section web interface. Default landing: **首頁 (Home)**. Primary tool for pros to manage availability, bookings, services, and profile.

---

## Sections

| Section | Route | Content | Key Fields / Actions |
|---|---|---|---|
| 首頁 (Home) | `/dashboard` | Default landing. Time-sensitive actions only. | `is_accepting` toggle (prominent, top); today's confirmed bookings (chronological); upcoming bookings (next 72hr); shortcut to Slots section |
| 時段管理 (Slots) | `/dashboard/slots` | Add / remove availability slots within 72-hr window | Time picker list (default UI); calendar grid (secondary UI); slot add / remove |
| 預約紀錄 (History) | `/dashboard/history` | Full log of all past bookings | Filter by date range; filter by status (completed / cancelled / no-show) |
| 我的服務 (Services) | `/dashboard/services` | Configure offered services + pricing | Toggle services on/off; edit `price_ntd`; edit density delta prices; edit fill-in prices for 補睫; manage `pro_nail_packages` |
| 設定 (Settings) | `/dashboard/settings` | Profile and preference management | `display_name`, `studio_address`, `portfolio_photos[]`, `ig_handle`, `no_show_window` |
| 訂閱 (Subscription) | `/dashboard/subscription` | Free trial progress + subscription status | `confirmed_booking_count` counter (X/10); `subscription_status`; upgrade CTA fires at count = 10 |

---

## Booking Card Fields

Shown on cards in Home (active) and History (past):

- Customer name
- Service summary (category + style tags)
- Appointment time: `starts_at` → `session_ends_at`
- Status badge: `confirmed` / `completed` / `cancelled_customer` / `cancelled_pro` / `no_show_customer` / `no_show_pro`
- **結束服務** button — active during session window (`starts_at` to `session_ends_at`); on tap: sets `completed_at = now`, `early_completion = true`, status → `completed`, rating prompt fired to customer
- **客戶未到場** button — activates only at `starts_at + no_show_window_minutes`; on tap: status → `no_show_customer`, flag on customer, slot marked used
- **Cancel booking** — available on any `confirmed` card; shows warning before confirming: 「取消後將影響您的排名與接單優先順序，確定取消？」; on confirm: status → `cancelled_pro`, hard flag on pro

---

## Slot Setting Rules

- Slots must be within the next 72 hours from now
- Slots are **15-minute increments**
- No minimum lead time — pro can open a slot starting immediately
- No cap on number of concurrent open slots
- All active services are available on every open slot — no per-slot service selection
- To exclude a service from future bookings: toggle it off in 我的服務, not at slot level
- Removing a slot with a confirmed booking is **blocked** — must cancel the booking first
- Toggling `is_accepting = false` hides pro from all search results but preserves existing confirmed bookings
- No recurring slots in MVP — manual slot-by-slot only

### Slot Visual States

| State | Color | Meaning |
|---|---|---|
| Past (expired) | Grey | Not selectable — `starts_at` has passed |
| Available | White | Tap to open (creates slot record) |
| Open — no booking | Purple | Tap to remove (deletes slot record) |
| Booked | Green | Locked — booking confirmed on this slot |

---

## Subscription States

| `subscription_status` | Pro Experience | Trigger |
|---|---|---|
| `'free'` | Full access. Counter shown: X / 10 confirmed bookings. | Default at approval. |
| `'active'` | Full access. Shows renewal date. | Pro pays NT$270/month after reaching 10 bookings. |
| `'read_only'` | Cannot set new slots. Booking history and profile remain visible. | Pro reaches 10 bookings and declines to pay. |

Payment in MVP = manual. Ilynn sends bank transfer details or LINE Pay link. No Stripe.

---

## Settings — Field Editability

| Field | Editable? | Notes |
|---|---|---|
| `display_name` | ⚠️ Yes — triggers re-review | Goes live after admin approves change |
| `studio_address` | ⚠️ Yes — triggers re-review | Geocoded again on save |
| `portfolio_photos[]` | ✅ Yes | Add / remove. Must keep min 3. |
| `ig_handle` | ✅ Yes | — |
| `no_show_window` | ✅ Yes | 10 / 15 / 20 min. Affects future bookings only — existing `no_show_window_minutes` snapshots are frozen. |
| `gender` | ❌ No | Contact support to change |
| `phone` | ✅ Yes | Private — revealed to customer at booking confirm |

---

## Open / Deferred

| Question | Status |
|---|---|
| Max portfolio photos per pro | TBD |
| Whether pros see their dispatch ranking / visibility score | Deferred post-MVP |
| Cancellation warning copy legal review | Deferred |
