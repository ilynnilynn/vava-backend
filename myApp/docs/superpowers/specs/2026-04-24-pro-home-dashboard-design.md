# Pro Home Screen — Dashboard Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current pro home screen with a growth-focused dashboard that drives slot-opening behaviour and shows weekly performance, not a duplicate of the bookings tab.

**Key insight:** Pros open this screen at the start of their day. The primary question is "am I visible to new clients right now?" — not "what's my schedule?". The schedule lives in the 預約 tab.

---

## Screen: 總覽 (Pro Home)

### Layout (top to bottom)

1. **Header** — title "總覽" + today's date (e.g. "4/24 週四")
2. **Smart nudge banner** — context-aware, adapts to slot state
3. **Today's slot status card** — tappable, navigates to 時段 tab
4. **Weekly performance row** — 3 stat cards

---

## Section 1: Smart Nudge Banner

A single-line contextual banner that changes based on whether the pro has open slots today.

**State A — No slots open (warning):**
- Warm amber background (`#fef3cd`)
- Terracotta dot indicator
- Text: "今日尚未開放時段。**開放時段**讓新客戶找到你 →"
- Tapping navigates to 時段 tab

**State B — Slots open, some booked (positive):**
- Light green background (`#f0fdf4`)
- Green dot indicator
- Text: "**N 個預約**已確認。還有 M 個空檔可接新客戶。"
- N = today's confirmed booking count, M = today's open-but-unbooked slot count

**State C — Slots open, none booked yet:**
- Light green background
- Green dot
- Text: "**N 個時段**已開放。等待新客戶預約中。"

The banner is always tappable and leads to the 時段 tab.

---

## Section 2: Today's Slot Status Card

A tappable card (`background: #F5F5F0`, `borderRadius: 12`) showing today's slot availability as a compact dot grid.

**Header row:**
- Left: "今日時段 · N 個開放" (or "今日時段" if none open)
- Right: status badge — "接客中" (green) if any slots open, "未開放" (grey) if none

**Dot grid:**
- One dot per slot (15-min increments, 09:00–18:00 = 36 slots → render as 6×6 or wrap naturally)
- Dot colours: terracotta = booked, dark (`#141413`) = open/available, light grey (`#E0E0D8` with border) = not open
- Dots are display-only (not individually tappable)

**Legend:** small inline legend below grid — "已預約 / 開放中 / 可開放"

**Footer CTA:** "前往開放時段 →" or "管理時段 →" (same either way), centred, separated by a thin divider

Tapping anywhere on the card calls `router.push('/(pro-tabs)/slots')`.

---

## Section 3: Weekly Performance Row

Three equal-width stat cards in a horizontal row.

| Stat | Label | Source |
|---|---|---|
| Search impressions | 搜尋曝光 | Mock: static number for now |
| Rating | 客戶評分 (★) | Mock: 4.9 |
| New bookings | 新預約 | Count of bookings created this week |

Cards: `background: #F5F5F0`, `borderRadius: 10`, number in 16px/700, label in 9px/`#858279`.

Section label "本週表現" (10px, 600, uppercase) sits above the row.

---

## Data Requirements

All data is derived from existing mock APIs — no new API needed for MVP.

```ts
// From fetchProBookings() + fetchSlots()
const { today, upcoming } = splitProBookings(bookings)
const todaySlots = slots.filter(s => isToday(s.starts_at))
const openSlots = todaySlots.filter(s => s.state === 'open')
const bookedSlots = todaySlots.filter(s => s.state === 'booked')
const thisWeekBookings = upcoming.filter(b => isThisWeek(b.starts_at))

// Nudge state
const nudgeState: 'none_open' | 'open_no_bookings' | 'open_with_bookings'
```

Slot grid renders all `todaySlots` (up to 36 dots). Both `fetchProBookings` and `fetchSlots` are called on focus.

---

## Navigation

- Slot card (anywhere) → `router.push('/(pro-tabs)/slots')`
- Nudge banner → `router.push('/(pro-tabs)/slots')`

---

## File Changes

- **Modify:** `app/(pro-tabs)/index.tsx` — full rewrite
- **No new components needed** — all UI is self-contained in the screen file (StatCard, SlotDot, NudgeBanner are small enough to inline)

---

## Out of Scope

- Real Supabase queries for impressions/rating (use mock values)
- Push notifications
- Revenue/earnings display
- Week-over-week comparison charts
