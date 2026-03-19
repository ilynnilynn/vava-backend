# Customer Booking Flow — Screen Map

_Dev reference. Source: Session 13 (2026-03-16). Consolidated from: Customer Selection Flow, Session 05 (scenario flows), Session 10 (state machine)._

---

## How to Read

- Each row = a discrete UI screen state
- Branching shown inline — follow the matching branch, skip the rest
- "Fields written" = what gets written to `bookings` at this step
- All screens after Screen 0 are part of the booking wizard (linear forward flow)

---

## Screen Map

| Screen | Name | Service Type | Inputs | Fields Written to `bookings` | Branch Conditions |
|---|---|---|---|---|---|
| 0 | Pro Profile / Slot Selection | All | Customer taps a time slot | `pro_id`, `slot_id`, `starts_at` | Gate: `pros.is_accepting = true` AND slot `is_booked = false`. Only open slots shown. |
| 1 | Service Type | 💅 Nails (multi-select) | 凝膠 / 卸甲 / 修補 / 保養 | `service_category_ids[]` | 凝膠 selected → Screen 2; all `skips_style = true` → Screen 5; 保養 selected → inject Screen 1b first |
| 1 | Service Type | 👁 Lashes (single select) | 嫁接 / 補睫 / 卸睫 / 睫毛管理 | `service_category_ids[]` | 嫁接 → Screen 2; 補睫 → Screen 1b → 1c → Screen 2; 卸睫 / 睫毛管理 → Screen 5 |
| 1b | Treatment Tier | Nails — 保養 only | 基本 / 深層 | `treatment_tier` ('basic'/'deep') | Then continue: 凝膠 also selected → Screen 2; otherwise → Screen 5 |
| 1b | 本店 or 他店? | Lashes — 補睫 only | 本店 / 他店 | `is_returning_customer` (bool) | 他店 → filter to `outside_fillin_enabled = true` pros only. Show note. → Screen 1c |
| 1c | Days Since Last Visit | Lashes — 補睫 only | ≤14 days / 15–21 days / >21 days | `fill_in_days` (int) | >21 days → BLOCK. Show copy + 「改選嫁接」CTA → redirects to 嫁接 flow. No booking created. ≤21 → Screen 2 |
| 2 | Style / Direction | 💅 Nails — 凝膠 (single select) | 單色 / 設計款 / 貓眼 / 法式 / 漸層 / 鏡面 / 套餐 | `style_id` (uuid) | 套餐 → Screen 2a → Screen 5 (skips add-ons); all others → Screen 2b (add-ons) |
| 2 | Style / Direction | 👁 Lashes — 嫁接/補睫 (single select) | 日式 / 韓式 / 歐美 / 新中式 / 特殊毛種 / 不確定 | `style_id` (uuid) | 日式/韓式/歐美 → Screen 2b Density; 新中式 → Screen 2b Style Tags; 特殊毛種 → Screen 2b Fiber Tag → Screen 2c Density; 不確定 → Screen 3 |
| 2a | Package Picker | Nails — 套餐 only | Pick from this pro's `pro_nail_packages` list | `nail_package_id` (uuid) | Single select. Add-ons skipped. → Screen 5 |
| 2b | Density | Lashes — 日式/韓式/歐美 (single select) | 自然輕盈 / 日常妝感 / 極致濃密 | `lash_density` ('light'/'daily'/'heavy') | → Screen 3 |
| 2b | Style Tags | Lashes — 新中式 (multi-select, optional) | 狐系 / 漫畫款 / 仙女款 / 太陽花 / 流蘇 + custom typed tags | `lash_style_tags[]` (text[]) | Optional — can skip. → Screen 3 |
| 2b | Fiber Tag | Lashes — 特殊毛種 (single select) | 山茶花 / 人魚編織(YY) / 6D羽毛 / 6D棉花 / 三葉草 | `lash_special_fiber_tag_id` (uuid) | Only show pros with that tag enabled. → Screen 2c |
| 2c | Density | Lashes — 特殊毛種 only (single select) | 自然輕盈 / 日常妝感 / 極致濃密 | `lash_density` ('light'/'daily'/'heavy') | → Screen 3 |
| 3 | Add-ons | 💅 Nails (凝膠 selected, 套餐 NOT picked) | 延甲 Extension (optional) | `addon_ids[]` | Multi-select, can skip. → Screen 4 |
| 3 | Add-ons | 👁 Lashes (嫁接/補睫) | 下睫毛 Bottom lashes (optional, only add-on) | `addon_ids[]` | Multi-select, can skip. → Screen 4 |
| 4 | Preference + Note + Photo | All | Preference flags (multi-select); free-text note; reference photo upload | `preference[]`, `customer_note`, `briefing_ref_photo_url` | All optional. Can skip entire screen. → Screen 5 |
| 5 | Price Range + Confirm | All | Customer reviews summary + taps 確認預約 | `status = 'confirmed'`, `session_ends_at`, `no_show_window_minutes` (snapshot from `pros.no_show_window`) | On confirm: `slot.is_booked = true`; LINE notification sent to pro → Screen 6 |
| 6 | Booking Confirmed | All | — | — | Shows 「預約成功！」, 10-min grace note, cancel button (visible 10 min only). After 10 min: cancel button disappears. → Screen 7 |
| 7 | Booking Card (Active Session) | All | 「我會晚到」 / 「設計師未到場」 / cancel / reschedule | See state transitions below | Pro phone revealed at `starts_at`. No-show button active at `starts_at + no_show_window_minutes`. |

---

## Screen 7 — State Transitions Available

| Action | Available When | Next State | Flag |
|---|---|---|---|
| Cancel (within grace) | < 10 min after `created_at` | `cancelled_grace` | None |
| Cancel (after grace, > 2hr before session) | After grace, > 2hr before `starts_at` | `cancelled_customer` | Soft |
| Cancel (30min – 2hr before session) | 30min–2hr before `starts_at` | `cancelled_customer` | Soft |
| Cancel (< 30min before session) | < 30min before `starts_at` | `cancelled_customer` | Hard |
| Request reschedule | Session > 2hr away only | `reschedule_pending` | None |
| Mark pro no-show | At `starts_at + no_show_window_minutes` | `no_show_pro` | Flag on pro |

---

## Terminal States per Scenario

| Scenario | Path | Terminal State |
|---|---|---|
| Happy path | Screen 0 → 1 → [branches] → 5 → 6 → 7 → auto at `session_ends_at` | `completed` |
| Customer cancels in grace | Screen 6 → cancel | `cancelled_grace` |
| Customer cancels after grace | Screen 7 → cancel | `cancelled_customer` |
| Pro cancels | Pro dashboard → cancel with warning | `cancelled_pro` |
| Customer no-show | Pro taps 客戶未到場 at +`no_show_window_minutes` | `no_show_customer` |
| Pro no-show | Customer taps 設計師未到場 at +`no_show_window_minutes` | `no_show_pro` |
| Reschedule approved | Screen 7 → request → pro approves | `rescheduled` (original) + new `confirmed` record |
| Reschedule declined / 6hr timeout | Pro declines or 6hr passes | Back to `confirmed` |
| Fill-in > 21 days | Screen 1c → BLOCK | No booking created |

---

## Fields Written to Booking Record

| Field | Nails example | Lashes — 嫁接 | Lashes — 補睫 |
|---|---|---|---|
| `nail_scope` | 'hands' | null | null |
| `service_category_ids` | [凝膠 uuid, 卸甲 uuid] | [嫁接 uuid] | [補睫 uuid] |
| `style_id` | 貓眼 uuid | 日式 uuid | 新中式 uuid |
| `lash_density` | null | 'light' | 'daily' |
| `lash_style_tags` | null | null | ['狐系'] |
| `lash_special_fiber_tag_id` | null | null | null |
| `addon_ids` | [延甲 uuid] | [下睫毛 uuid] | [] |
| `treatment_tier` | null | null | null |
| `fill_in_days` | null | null | 10 |
| `is_returning_customer` | null | null | true |
| `nail_package_id` | null | null | null |
| `preference` | ['no_conversation'] | [] | null |
| `customer_note` | 'text' | null | null |
| `briefing_ref_photo_url` | null | url | null |
| `no_show_window_minutes` | (from pro setting) | (from pro setting) | (from pro setting) |
| `status` | 'confirmed' | 'confirmed' | 'confirmed' |
