# Pro Onboarding Flow

_Dev reference. Source: Session 11 (2026-03-15). Last reviewed: 2026-03-23._

---

## Overview

Linear 8-step flow, completed once. After submission, admin reviews and sets `is_approved = true`. Pro notified via LINE. All steps required unless marked optional.

---

## Step Table

| Step | Screen | Fields Collected | Constraints |
|---|---|---|---|
| 1 | LINE Login | `pros.line_user_id`, `pros.profile_photo_url` | LINE OAuth. Creates `pros` row with `is_approved = false`. |
| 2 | Basic Info | `display_name`, `phone`, `gender`, `ig_handle` | All required. Gender: 男/女/不透露. Not editable self-serve after submission — contact support. |
| 3 | Studio Address | `studio_address` → geocoded to `studio_lat`, `studio_lng` | Required. Triggers re-review if changed post-approval. |
| 4 | Domain and Scope | Service domain: Nails / Lashes / Both; `nail_scope` ('hands'/'feet'/'both') if nails | Determines which service screens appear in Step 5. |
| 5 | Services and Pricing | `pro_services` rows: `is_enabled`, `price_ntd`, `duration_minutes`. Lash directions show density delta fields (`density_light/daily/heavy_delta`). 補睫 shows 4 fill-in price fields (`same_shop_14/21_price`, `outside_shop_14/21_price`) + `outside_fillin_enabled`. `pro_nail_packages` rows if 套餐 enabled. | Min 1 service `is_enabled = true` to proceed. Editable later in dashboard. Per-domain sub-pages when domain = both. |
| 6 | Preferences and Settings | `no_show_window` (10 / 15 / 20 min, default 15) | Editable in dashboard settings later. |
| 7 | Portfolio and ID | `portfolio_photos[]` (min 3, array of URLs); `id_photo_front_url` (camera or file upload) | Camera API via mobile web HTTPS (guaranteed by Vercel). Admin verifies ID manually. `id_photo_front_url` stored in Supabase Storage, never exposed to customers. |
| 8 | Submit for Review | Summary confirmation screen | Sets `submitted_at`. Account read-only until approved. Pro sees 審核中 state. |

---

## Post-Submission States

| State | Pro UI | Admin Action |
|---|---|---|
| Submitted, pending | 「審核中，我們將於X個工作天內通知您」 | Reviews profile, ID photo, portfolio quality, studio address |
| Approved | LINE notification sent. Pro redirected to dashboard. | Sets `is_approved = true` |
| Rejected | Manual LINE message from admin. No self-serve rejection flow in MVP 1. | — |

---

## Post-Approval

- Pro lands on dashboard with `is_accepting = false`
- Dashboard shows prompt: "Set up your service menu to start receiving bookings" → links to `/dashboard/services` (TODO: implement dashboard service menu setup)
- Must manually toggle 接單中 to start appearing in search results
- `subscription_status = 'free'` until `confirmed_booking_count` reaches 10
- Paywall triggers at `confirmed_booking_count = 10` → NT$270/month prompt

---

## Re-Review Triggers

- `display_name` changed post-approval → re-review flag, change goes live only after admin approves
- `studio_address` changed post-approval → re-review flag, same hold behavior
- `gender` not editable self-serve after onboarding — must contact support

---

## Constraints Summary

- `is_approved = false` blocks pro from appearing in all customer search results
- Min 3 portfolio photos required to submit (Step 7 gate)
- Min 1 service `is_enabled = true` required to proceed past Step 5
- Camera API requires HTTPS — guaranteed by Vercel deployment
- `id_photo_front_url` stored in Supabase Storage only — never returned to any customer-facing API
