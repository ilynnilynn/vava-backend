# Booking State Machine

_Dev reference. Source: Session 10 (2026-03-15). Authoritative for status enum: Strategy & Decision Log._

---

## States

`confirmed` · `reschedule_pending` · `rescheduled` · `completed` · `cancelled_grace` · `cancelled_customer` · `cancelled_pro` · `no_show_customer` · `no_show_pro` · `expired`

---

## State Transitions

| Current State | Trigger | Actor | Next State | Side Effects |
|---|---|---|---|---|
| — | Customer taps 確認預約 | Customer | `confirmed` | `slot.is_booked = true`; LINE sent to pro; `session_ends_at` set; `no_show_window_minutes` snapshot written from `pros.no_show_window` |
| `confirmed` | Within 10 min of `created_at` | Customer | `cancelled_grace` | Slot freed; no flag; LINE to pro |
| `confirmed` | After grace, before session | Customer | `cancelled_customer` | Slot freed; flag by timing (see rules); LINE to pro |
| `confirmed` | Any time before session | Pro | `cancelled_pro` | Slot freed; hard flag on pro; warm handoff LINE to customer |
| `confirmed` | Customer requests reschedule (session > 2hr away) | Customer | `reschedule_pending` | LINE sent to pro requesting approval |
| `reschedule_pending` | Pro approves | Pro | `rescheduled` | Old slot freed; new slot locked; LINE confirmation to customer |
| `reschedule_pending` | Pro declines | Pro | `confirmed` | Returns to original booking; LINE to customer |
| `reschedule_pending` | 6hr timeout, no pro response | System | `confirmed` | Returns to original booking; LINE to customer |
| `confirmed` | `session_ends_at` passes | System | `completed` | `completed_at` set; rating prompt fired to customer (1hr delay) |
| `confirmed` | Pro taps 結束服務 before `session_ends_at` | Pro | `completed` | `completed_at` = now; `early_completion = true`; rating prompt fired |
| `confirmed` | Pro taps 客戶未到場 at +`no_show_window_minutes` | Pro | `no_show_customer` | Flag on customer; slot marked used |
| `confirmed` | Customer taps 設計師未到場 at +`no_show_window_minutes` | Customer | `no_show_pro` | Flag on pro; warm handoff LINE to customer |
| `confirmed` | Slot conflict or system error | System | `expired` | Edge case only |

---

## Scheduled Side Effects

| Time | Event |
|---|---|
| −10 min before `starts_at` | LINE reminder sent to customer; pro phone number revealed on booking card; 「我會晚到」button appears — stays visible throughout session |
| `starts_at` + `no_show_window_minutes` | No-show buttons activate on both sides; 「我會晚到」stays visible |
| `session_ends_at` | Status auto-flips to `completed`; `completed_at` set |
| `session_ends_at` + 1hr | Rating prompt sent via LINE to customer and pro |

---

## Rules

- Reschedule option only shown if session is **> 2hr away**. Hidden entirely otherwise.
- `reschedule_pending` auto-reverts to `confirmed` after **6hr** with no pro response. LINE sent to customer.
- No-show buttons activate at **+`no_show_window_minutes`** only — never before. Value frozen at booking confirm time from `pros.no_show_window` (10 / 15 / 20 min, default 15).
- `cancelled_grace` = no flag, no record. Slot freed immediately.
- **Customer cancellation flag severity:**
  - After grace, > 2hr before session → soft flag
  - 30min – 2hr before session → soft flag
  - < 30min before session / same day → hard flag
- **Pro cancellation** = always hard flag, regardless of timing.
- **Terminal states** (no transitions out): `completed`, `no_show_customer`, `no_show_pro`, `cancelled_grace`, `cancelled_customer`, `cancelled_pro`, `expired`
- `rescheduled` is terminal for the original booking record. The new slot creates a separate `confirmed` booking record.
- If customer books after 9pm for next day: the 9pm reminder window has passed — no reminder fires. Accepted edge case.
