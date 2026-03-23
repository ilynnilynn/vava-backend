// ============================================================
// VAVA — Database Types
// Source of truth: Notion → 🗄️ VAVA Data Model
// Last synced: 2026-03-16
//
// DO NOT edit manually.
// Update the Notion Data Model page, then re-sync.
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type BookingStatus =
  | 'confirmed'           // Booking locked. Awaiting session.
  | 'reschedule_pending'  // Customer requested reschedule, awaiting pro (6hr timeout → confirmed)
  | 'rescheduled'         // Approved. Original booking terminal; new booking = separate confirmed record.
  | 'cancelled_grace'     // Cancelled within 10-min grace. No flag.
  | 'cancelled_customer'  // Cancelled by customer after grace. Flag applied.
  | 'cancelled_pro'       // Cancelled by pro. Hard flag applied.
  | 'completed'           // Session ended (auto at session_ends_at OR pro taps 結束服務 early)
  | 'no_show_customer'    // Pro marked customer no-show
  | 'no_show_pro'         // Customer marked pro no-show
  | 'expired'             // Edge case — slot conflict or system error

export type LashDensity =
  | 'light'   // 自然輕盈 — 100–150 lashes
  | 'daily'   // 日常妝感 — 150–300 lashes
  | 'heavy'   // 極致濃密 — 300–500+ lashes

export type SubscriptionStatus =
  | 'free'       // < 10 confirmed bookings. Full access.
  | 'active'     // Paying subscriber. Full access.
  | 'read_only'  // Reached 10, declined to pay. Cannot set new slots.

export type FlagType =
  | 'soft'     // Light cancellation — doesn't immediately hurt standing
  | 'hard'     // Same-day cancel / <30min cancel — hurts standing
  | 'no_show'  // No-show — immediate suspension risk

export type FlaggedEntity = 'user' | 'pro'

export type ProStanding =
  | 'good'       // 0–1 soft, 0 hard
  | 'warning'    // 2+ soft OR 1 hard
  | 'at_risk'    // 3+ soft OR 2+ hard OR 1 same-day
  | 'suspended'  // 2+ same-day OR 1 no_show (pro)

export type NailScope = 'hands' | 'feet' | 'both'

export type TreatmentTier = 'basic' | 'deep'

export type CancellationActor = 'customer' | 'pro'

export type NoShowReporter = 'customer' | 'pro'

export type RaterType = 'customer' | 'pro'

export type ServiceDomain = 'nails' | 'lashes'

// ── Table: users ─────────────────────────────────────────────

export type User = {
  id: string                       // uuid PK, auto-generated
  line_user_id: string             // from LINE Login OAuth. UNIQUE.
  name: string                     // editable by user (deployed column is 'name', not 'display_name')
  phone: string                    // required at onboarding
  birth_year: number               // required, read-only after set
  profile_photo_url: string | null // from LINE profile
  auth_provider: 'line'            // 'line' only in MVP 1
  line_notifications: boolean      // default true
  created_at: string
  updated_at: string
}

// ── Table: pros ──────────────────────────────────────────────

export type Pro = {
  id: string                       // uuid PK — set to auth.users.id on creation
  line_user_id: string             // from LINE Login OAuth. UNIQUE.
  display_name: string             // public-facing. Triggers re-review if changed.
  phone: string                    // internal/ops only. NEVER exposed to customers.
  ig_handle: string                // required
  studio_address: string           // triggers re-review if changed
  studio_lat: number | null        // geocoded from address
  studio_lng: number | null        // geocoded from address
  nail_scope: NailScope | null     // only set if domain includes nails
  gender: 'male' | 'female' | 'non-binary' // not editable self-serve
  profile_photo_url: string | null // from LINE profile
  portfolio_photos: string[]       // min 3. Array of URLs.
  id_photo_path: string | null     // Supabase Storage path for ID photo (private bucket)
  is_approved: boolean             // default false. Set true by admin.
  is_suspended: boolean            // default false. Set by flag system.
  is_accepting: boolean            // 'Accepting Requests Now' toggle. Default false.
  submitted_at: string | null      // set when pro submits onboarding
  subscription_status: SubscriptionStatus
  confirmed_booking_count: number  // counter. Triggers paywall at 10.
  standing: ProStanding            // computed from flags — stored for fast querying
  no_show_window_minutes: 10 | 15 | 20  // minutes before pro can mark no-show. Default 15.
  work_start_hour: number               // 0–23, default 10
  work_end_hour: number                 // 1–24, default 20
  created_at: string
  updated_at: string
}

// ── Table: service_categories ────────────────────────────────
// VAVA-owned. Pros toggle + price these, never write them.

export type ServiceCategory = {
  id: string
  domain: ServiceDomain
  name_zh: string       // e.g. 凝膠, 卸甲, 嫁接
  name_en: string       // e.g. Gel, Nail Removal, New set
  has_styles: boolean   // true = style step shown
  skips_style: boolean  // true = no style step, go straight to price
  is_standalone: boolean // false = add-on only (延甲)
  is_addon: boolean      // true = can be stacked on top of another booking
  is_active: boolean     // admin can deprecate. Default true.
}

// ── Table: service_style_modifiers ───────────────────────────
// VAVA-owned. Style/direction layer.

export type ServiceStyleModifier = {
  id: string
  service_type: string  // deployed column (not 'domain')
  name_zh: string       // e.g. 貓眼, 日式
  name_en: string       // e.g. Cat eye, Japanese
  is_active: boolean    // admin can deprecate. Default true.
}

// ── Table: pro_services ──────────────────────────────────────
// Junction table. One row per pro × category × style combo.

export type ProService = {
  id: string
  pro_id: string                        // FK → pros.id
  category_id: string                   // FK → service_categories.id
  style_id: string | null               // FK → service_style_modifiers.id. null when skips_style.
  is_enabled: boolean                   // pro toggle. Default false.
  price_ntd: number                     // base price set by pro
  addon_price_ntd: number | null        // only when is_addon = true
  duration_minutes: number
  outside_fillin_enabled: boolean       // 補睫 only. Default false.
  same_shop_14_price: number | null     // 補睫 only. 本店, ≤14 days.
  same_shop_21_price: number | null     // 補睫 only. 本店, 15–21 days.
  outside_shop_14_price: number | null  // 補睫 only. 他店, ≤14 days.
  outside_shop_21_price: number | null  // 補睫 only. 他店, 15–21 days.
  density_light_delta: number | null    // lashes only. Price add for 自然輕盈.
  density_daily_delta: number | null    // lashes only. Price add for 日常妝感.
  density_heavy_delta: number | null    // lashes only. Price add for 極致濃密.
}

// ── Table: pro_nail_packages ─────────────────────────────────
// Pro-owned. One row per named package a pro offers.

export type ProNailPackage = {
  id: string
  pro_id: string         // FK → pros.id
  name: string           // pro sets this. e.g. 春日法式套餐
  price_ntd: number      // fixed total price
  duration_minutes: number
  is_enabled: boolean    // default false
  created_at: string
}

// ── Table: slots ─────────────────────────────────────────────

export type Slot = {
  id: string
  pro_id: string          // FK → pros.id
  starts_at: string       // ISO timestamp
  ends_at: string | null  // null until booking lands; then = starts_at + total duration
  is_booked: boolean      // default false. True once booking confirmed.
  is_expired: boolean     // default false. Auto-set when starts_at passes.
  created_at: string
}

// ── Table: bookings ──────────────────────────────────────────

export type Booking = {
  id: string
  user_id: string                        // FK → users.id
  pro_id: string                         // FK → pros.id
  slot_id: string                        // FK → slots.id
  service_category_ids: string[]         // uuid[] — multi-select
  style_id: string | null                // FK → service_style_modifiers.id. null if skips_style.
  lash_density: LashDensity | null       // 日式/韓式/歐美/特殊毛種 only
  lash_special_fiber_tag_id: string | null // 特殊毛種 only
  lash_style_tags: string[] | null       // 新中式 only. Editable tags.
  addon_ids: string[] | null
  nail_scope: NailScope | null           // nails only
  treatment_tier: TreatmentTier | null  // 保養 only
  fill_in_days: number | null            // 補睫 only
  is_returning_customer: boolean | null  // 補睫 only
  starts_at: string                      // populated from slots.starts_at via slot_id join (not a DB column)
  price_min: number                      // MIN across matching pros at booking time
  price_max: number                      // MAX across matching pros at booking time
  status: BookingStatus
  briefing_ref_photo_url: string | null
  cancelled_at: string | null
  cancellation_actor: CancellationActor | null
  no_show_reported_at: string | null
  no_show_reporter: NoShowReporter | null
  customer_late_notified_at: string | null
  reminder_sent_at: string | null
  rating_prompt_sent: boolean           // true if rating prompt was sent after completion
  session_ends_at: string               // slot.starts_at + total duration. Set at confirm.
  nail_package_id: string | null        // 套餐 only
  preference: string[] | null           // e.g. ['no_conversation']
  customer_note: string | null
  completed_at: string | null           // auto at session_ends_at OR early (pro taps 結束服務)
  early_completion: boolean             // true if pro tapped 完成 before session_ends_at
  no_show_window_minutes: number        // snapshot from pro.no_show_window at confirm time. Frozen.
  proposed_slot_id: string | null       // reschedule flow: proposed new slot_id, set when customer requests
  created_at: string                    // booking confirm timestamp
}

// ── Table: flags ─────────────────────────────────────────────

export type Flag = {
  id: string
  booking_id: string           // FK → bookings.id
  flagged_entity: FlaggedEntity
  flagged_id: string           // users.id or pros.id
  flag_type: FlagType
  is_same_day: boolean
  note: string | null          // internal only
  created_at: string
}

// ── Table: lash_special_fiber_tags ───────────────────────────
// VAVA-defined lookup table.

export type LashSpecialFiberTag = {
  id: string
  name_zh: string   // 山茶花 / 人魚編織（YY）/ 6D羽毛 / 6D棉花 / 三葉草
  name_en: string   // Camellia / Mermaid Weave (YY) / 6D Feather / 6D Cotton / Clover
  is_active: boolean
}

// ── Table: pro_special_fiber_prices ──────────────────────────
// Junction table. One row per pro × fiber tag.

export type ProSpecialFiberPrice = {
  id: string
  pro_id: string               // FK → pros.id
  tag_id: string               // FK → lash_special_fiber_tags.id
  is_enabled: boolean
  price_ntd: number            // base price per tag
  density_light_delta: number  // price add for 自然輕盈. Default 0.
  density_daily_delta: number  // price add for 日常妝感
  density_heavy_delta: number  // price add for 極致濃密
  duration_minutes: number
}

// ── Table: ratings ───────────────────────────────────────────

export type Rating = {
  id: string
  booking_id: string    // FK → bookings.id
  rater_type: RaterType
  rater_id: string
  ratee_id: string
  stars: 1 | 2 | 3 | 4 | 5
  comment: string | null  // customer ratings only (public)
  is_public: boolean      // true = customer rates pro. false = pro rates customer.
  created_at: string
}

// ── Computed helpers ─────────────────────────────────────────
// Standing is computed from flags, not stored.
// Good:      0–1 soft, 0 hard
// Warning:   2+ soft OR 1 hard
// At Risk:   3+ soft OR 2+ hard OR 1 same-day
// Suspended: 2+ same-day OR 1 no_show (pro)

export function computeStanding(flags: Flag[]): ProStanding {
  const soft     = flags.filter(f => f.flag_type === 'soft').length
  const hard     = flags.filter(f => f.flag_type === 'hard').length
  const sameDay  = flags.filter(f => f.is_same_day).length
  const noShow   = flags.filter(f => f.flag_type === 'no_show').length

  if (sameDay >= 2 || noShow >= 1)              return 'suspended'
  if (sameDay >= 1 || soft >= 3 || hard >= 2)   return 'at_risk'
  if (soft >= 2 || hard >= 1)                   return 'warning'
  return 'good'
}

// ── Shared response wrapper ───────────────────────────────────
// Use this for all server action / API route return values.

export type Result<T> = {
  data: T | null
  error: string | null
}
