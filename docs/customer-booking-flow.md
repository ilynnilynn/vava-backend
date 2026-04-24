# Customer Booking Flow — Screen Map

_Dev reference. Source: Sessions 14 + 15 + 16 (2026-03-23). Session 13 fully superseded._
_Screens 0–2: Session 14. Screens 3–6: Session 15. Screen 1 service steps: Session 16._

---

## Flow Overview

| Screen | Name | Description |
|---|---|---|
| 0 | Home | 美甲 / 美睫 CTA. Active booking cards above CTA when confirmed bookings exist. |
| 1 | Filtering Form | Step-by-step wizard: location, date, time band, service, optional preferences |
| 2 | Results | Map + pro list. Filters, sort, fallback tiers. |
| 3 | Pro Card Expanded | Slot selection within requested window. CTA → confirm. |
| 4 | Confirm | Summary page. 確認預約 CTA. Booking created on submit. |
| 5 | Booking Confirmed | 預約成功. Grace period cancel. |
| 6 | Booking Card | Three sub-states: waiting / day-of / post-session. |

---

## Screen 0 — Home

**State A (no active bookings):** 美甲 / 美睫 CTA only.

**State B (has confirmed upcoming bookings):**
- All upcoming confirmed booking cards, sorted soonest first
- 美甲 / 美睫 CTA below cards
- Multiple simultaneous bookings allowed — no session time overlap
- Only bookings within 72hr window shown on home

---

## Screen 1 — Filtering Form (step-by-step wizard)

### Steps shared by both domains

| Step | Field | Type | Rules |
|---|---|---|---|
| A | Service type | Pre-selected from Screen 0: 美甲 or 美睫 | — |
| B | Location | GPS auto → 「目前位置」 | First visit: GPS permission prompt. Editable: type address or drop pin on map. |
| C | Date | Chips: 現在 (within 1hr) / 今天 / 明天 / 星期X — next 5–7 days | — |
| Cb | Time band | 🌅 早上 9–12 / ☀️ 下午 12–17 / 🌆 傍晚 17–22 / 不限時段 | Skipped entirely if 現在 selected |

### Nails — service steps (after location/time)

| Step | Field | Type | Rules |
|---|---|---|---|
| 1 | Service | Multi-select: 凝膠 / 卸甲 / 修補 / 保養 | Required |
| 1b | Treatment tier | Inline below 保養: 基本 / 深層 | Only when 保養 selected. `booking.treatment_tier` |
| 1c | Style | Optional dropdown: 單色 / 設計款 / 貓眼 / 法式 / 漸層 / 鏡面 | Only when 凝膠 selected. No packages at form stage — price shown as "from NT$X" |
| 2 | Add-ons | Optional: 延甲 | Next page. Only shown when 凝膠 or 修補 selected. `addon_ids[]` |

### Lashes — service steps (after location/time)

| Step | Field | Type | Rules |
|---|---|---|---|
| 1 | Service | Single select: 嫁接 / 補睫 / 卸睫 / 睫毛管理. 卸睫 multi-selectable with others. | Required |
| 1b | Fill-in days | Inline below 補睫: ≤14 / 15–21 / >21 | Only when 補睫 tapped. >21 → warning popup → redirect to 嫁接. `fill_in_days` |
| 1c | Direction | Optional: 日式 / 韓式 / 歐美 / 新中式 / 特殊毛種 / 不確定 | `style_id` |
| 1d | Density | Optional, inline after direction if applies | 自然輕盈 / 日常妝感 / 極致濃密. `lash_density` |
| 1e | Style tags | Optional, inline after 新中式 | 狐系 / 漫畫款 / 仙女款 / 太陽花 / 流蘇. Custom tags allowed. `lash_style_tags[]` |
| 1f | Fiber tag | Optional, inline after 特殊毛種 | 山茶花 / 人魚編織(YY) / 6D羽毛 / 6D棉花 / 三葉草. `lash_special_fiber_tag_id` |
| 2 | Add-ons | Optional: 下睫毛 | Next page. Only shown for 嫁接 / 補睫. `addon_ids[]` |

### Steps shared by both domains (continued)

| Step | Field | Type | Rules |
|---|---|---|---|
| P | Preference | Optional: 靜默服務 | `preference[]` |
| N | Notes | Optional free text | `customer_note` |
| R | Ref photo | Optional upload | `briefing_ref_photo_url` |

**Lashes assumption (always applied, never asked):**
- 補睫: always treated as 他店. No 本店/他店 question.

---

## Screen 2 — Results

**Layout:** Map top 1/3 (pins) + scrollable pro list below.

**Pro card (collapsed):**
- Pro name
- Portfolio photos (swipeable, tappable to enlarge)
- Available slots within requested time window
- Price from NT$X (based on selected service)
- District + distance (e.g. 大安區 · 0.8km)

**Page-level filters:**
- Budget: range slider
- Distance: 1km / 3km / 5km presets

**Default sort:** Closest distance → soonest available slot.

**Map:** Tapping a pin highlights the corresponding card in the list.

**Edit request:** Re-opens the filtering form. Resubmitting replaces all results entirely.

**Fallback tiers:**

| Tier | Condition | What's Shown |
|---|---|---|
| Exact match | Pros match all form criteria | Normal results list |
| Closest fit | No exact matches | Divider: 「找不到完全符合條件的設計師，以下是最接近你要求的美業老師」. Relaxation order: location first, then time. Service must always match. |
| No matches | Zero exact + zero closest-fit | Show any pros with open slots in next 72hr within 5km |

---

## Screen 3 — Pro Card Expanded

**Triggered by:** Tapping any pro card in results list.

**Shows:**
- Pro name
- Portfolio photos (swipeable, tappable — same as collapsed)
- Available time slots within customer's requested window (selectable)

**Does NOT show:** Ratings (no data for MVP 1), services list, bio. No full profile in MVP 1 — this is the deepest view before confirm.

**Slot interaction:**
- Tap a slot → slot highlighted + duration shown
- 「保留時段」CTA activates (ghost/disabled until slot selected)

---

## Screen 4 — Confirm

**Shows:**
- Pro name
- Service (+ style if selected on form)
- Date + time
- Duration
- Price from NT$X
- Payment note: 「實際費用將於服務結束後由設計師確認」

**Rules:**
- Density / add-ons / packages: if not filled on form, not shown here. No second chance to add on this screen.
- Price is "from NT$X" — final price settled at session by pro.

**CTA:** 「確認預約」

**On confirm:**
- `booking.status = 'confirmed'`
- `slot.is_booked = true`
- `session_ends_at` set
- `no_show_window_minutes` snapshot written from pro's `no_show_window`
- LINE notification sent to pro

---

## Screen 5 — Booking Confirmed

**Shows:**
- 「預約成功！」
- Pro name, service summary, date + time, studio address
- Cancellation line: 「臨時改變主意？10分鐘內[免責取消](#)」 — underlined CTA
- Cancellation rules explained below the CTA

**After grace period (10 min):**
- Cancel button stays visible — does NOT disappear
- Copy updates to reflect standard cancellation rules (soft/hard flag by timing)

**Navigation:** Back to home — booking card now visible at top of home screen.

---

## Screen 6 — Booking Card

### Sub-state A: Waiting (confirmed, before session day)

**Shows:**
- Pro name, service summary, date + time, studio address
- 「編輯預約」button → opens sub-options: reschedule | cancel

**Reschedule:** Opens separate screen showing pro's available slots.

**Cancel:** Follows cancellation flag rules by timing (see booking-states.md).

---

### Sub-state B: Day-of (session approaching / active)

**Timing rules:**

| Time | Event |
|---|---|
| −10 min before `starts_at` | Pro phone number revealed on card |
| −10 min before `starts_at` | 「我會晚到」button appears — stays visible throughout session |
| `starts_at + no_show_window_minutes` | 「設計師未到場」button activates |

---

### Sub-state C: Post-session

**After `completed_at` is set:**
- Booking card transitions to rating prompt on a **separate screen**.

---

## Cancellation State Transitions (from Screen 6)

| Action | Available When | Next State | Flag |
|---|---|---|---|
| Cancel (within grace) | < 10 min after `created_at` | `cancelled_grace` | None |
| Cancel (after grace, > 2hr before session) | After grace, > 2hr before `starts_at` | `cancelled_customer` | Soft |
| Cancel (30min–2hr before session) | 30min–2hr before `starts_at` | `cancelled_customer` | Soft |
| Cancel (< 30min before session) | < 30min before `starts_at` | `cancelled_customer` | Hard |
| Request reschedule | Session > 2hr away only | `reschedule_pending` | None |
| Mark pro no-show | At `starts_at + no_show_window_minutes` | `no_show_pro` | Flag on pro |
