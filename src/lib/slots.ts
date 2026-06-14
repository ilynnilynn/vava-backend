// ============================================================
// SLOTS — all slot operations
//
// Rule: import this file everywhere you need slot logic.
// Never write slot queries directly in components or pages.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Slot, Result } from '@/types/database'
import { haversineKm } from '@/lib/geo'

// ── Constants ────────────────────────────────────────────────

export const SLOT_WINDOW_HOURS     = 72   // locked — see Strategy & Decision Log
export const SLOT_INCREMENT_MINS   = 30   // 30-minute increments

// ── Types ────────────────────────────────────────────────────

export type AvailabilityBlock = {
  startTime: string    // HH:mm
  endTime: string      // HH:mm
  isBooked: boolean
  slotIds: string[]
}

// ── Write ─────────────────────────────────────────────────────

// Add a single slot for a pro.
// Validates: within 72hr window, on a 15-min boundary.
export async function addSlot(
  proId: string,
  startsAt: string  // ISO timestamp
): Promise<Result<Slot>> {
  const supabase = await createClient()

  const start  = new Date(startsAt)
  const now    = new Date()
  const maxTime = new Date(now.getTime() + SLOT_WINDOW_HOURS * 60 * 60 * 1000)

  if (start <= now)    return { data: null, error: 'Slot must be in the future' }
  if (start > maxTime) return { data: null, error: `Slot must be within ${SLOT_WINDOW_HOURS} hours` }

  // Validate 30-min boundary
  const mins = start.getMinutes()
  if (mins % SLOT_INCREMENT_MINS !== 0) {
    return { data: null, error: `Slot must start on a ${SLOT_INCREMENT_MINS}-minute boundary (e.g. :00, :30)` }
  }

  const { data, error } = await supabase
    .from('slots')
    .insert({ pro_id: proId, starts_at: startsAt, is_booked: false, is_expired: false })
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

// Remove a slot. Blocked if is_booked — pro must cancel the booking first.
export async function removeSlot(slotId: string): Promise<Result<null>> {
  const supabase = await createClient()

  const { data: slot } = await supabase
    .from('slots')
    .select('is_booked')
    .eq('id', slotId)
    .single()

  if (!slot)          return { data: null, error: 'Slot not found' }
  if (slot.is_booked) return { data: null, error: 'Cannot remove a booked slot — cancel the booking first' }

  await supabase.from('slots').delete().eq('id', slotId)
  return { data: null, error: null }
}

// ── Read ──────────────────────────────────────────────────────

// All open slots for a pro within 72hr window (for pro dashboard).
export async function getProSlots(proId: string): Promise<Slot[]> {
  const supabase = await createClient()
  const now      = new Date().toISOString()
  const maxTime  = new Date(Date.now() + SLOT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('slots')
    .select('*')
    .eq('pro_id', proId)
    .eq('is_expired', false)
    .gte('starts_at', now)
    .lte('starts_at', maxTime)
    .order('starts_at', { ascending: true })

  return data ?? []
}

// Open (not booked, not expired) slots for a pro within 72hr — for customer browse.
export async function getProAvailableSlots(proId: string): Promise<Slot[]> {
  const supabase = await createClient()
  const now      = new Date().toISOString()
  const maxTime  = new Date(Date.now() + SLOT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('slots')
    .select('*')
    .eq('pro_id', proId)
    .eq('is_booked', false)
    .eq('is_expired', false)
    .gte('starts_at', now)
    .lte('starts_at', maxTime)
    .order('starts_at', { ascending: true })

  return data ?? []
}

// ── Cron ──────────────────────────────────────────────────────

// Mark slots as expired when starts_at has passed. Called by scheduled job.
// Pass admin client from cron routes (no user session available).
export async function expireStaleSlots(supabase?: SupabaseClient): Promise<void> {
  const sb = supabase ?? await createClient()
  await sb
    .from('slots')
    .update({ is_expired: true })
    .lt('starts_at', new Date().toISOString())
    .eq('is_expired', false)
}

// ── UI helper ─────────────────────────────────────────────────

// Generate valid 15-min slot start times for a given day.
// Used to populate the time picker in the pro dashboard.
// Returns only future times within the 72hr window.
// startHour/endHour: optional working hours filter (endHour is exclusive).
export function generateSlotOptions(
  date: Date,
  startHour: number = 0,
  endHour: number = 24,
): Date[] {
  const slots: Date[] = []
  const now     = new Date()
  const maxTime = new Date(now.getTime() + SLOT_WINDOW_HOURS * 60 * 60 * 1000)

  const cursor = new Date(date)
  cursor.setHours(startHour, 0, 0, 0)

  const end = new Date(date)
  end.setHours(endHour, 0, 0, 0)

  while (cursor < end) {
    if (cursor > now && cursor <= maxTime) {
      slots.push(new Date(cursor))
    }
    cursor.setTime(cursor.getTime() + SLOT_INCREMENT_MINS * 60 * 1000)
  }

  return slots
}

// Format a slot time for display: "3:30 PM" or "15:30" depending on locale
export function formatSlotTime(startsAt: string, locale: 'zh' | 'en' = 'zh'): string {
  const date = new Date(startsAt)
  return date.toLocaleTimeString(locale === 'zh' ? 'zh-TW' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',
  })
}

// ── Block operations ─────────────────────────────────────────

// Helper: format Date to HH:mm
function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// Helper: format Date to YYYY-MM-DD (local timezone)
function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Group consecutive same-status slots into blocks per day.
// Returns Record<YYYY-MM-DD, AvailabilityBlock[]>.
// "Consecutive" = next slot starts_at is exactly SLOT_INCREMENT_MINS after previous.
// Splits at booked/unbooked boundaries.
export function reconstructBlocks(slots: Slot[]): Record<string, AvailabilityBlock[]> {
  if (slots.length === 0) return {}

  const sorted = [...slots].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )

  const result: Record<string, AvailabilityBlock[]> = {}
  const incrementMs = SLOT_INCREMENT_MINS * 60 * 1000

  for (const slot of sorted) {
    const slotDate = new Date(slot.starts_at)
    const dateKey = toDateKey(slotDate)
    const timeStr = toHHmm(slotDate)
    const isBooked = slot.is_booked

    if (!result[dateKey]) result[dateKey] = []
    const blocks = result[dateKey]
    const lastBlock = blocks[blocks.length - 1]

    // Check if this slot continues the last block
    if (lastBlock && lastBlock.isBooked === isBooked) {
      // Parse last block endTime to check if consecutive
      const [eh, em] = lastBlock.endTime.split(':').map(Number)
      const lastEndMs = new Date(slotDate)
      lastEndMs.setHours(eh, em, 0, 0)

      if (Math.abs(slotDate.getTime() - lastEndMs.getTime()) < 1000) {
        // Consecutive — extend the block
        const slotEnd = new Date(slotDate.getTime() + incrementMs)
        lastBlock.endTime = toHHmm(slotEnd)
        lastBlock.slotIds.push(slot.id)
        continue
      }
    }

    // Start a new block
    const slotEnd = new Date(slotDate.getTime() + incrementMs)
    blocks.push({
      startTime: timeStr,
      endTime: toHHmm(slotEnd),
      isBooked,
      slotIds: [slot.id],
    })
  }

  return result
}

// Create 30-min slots spanning a time range. Uses admin client.
// date: YYYY-MM-DD, startTime/endTime: HH:mm
export async function addBlock(
  proId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<Result<Slot[]>> {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em

  if (endMins <= startMins) {
    return { data: null, error: '結束時間必須在開始時間之後' }
  }
  if (startMins % SLOT_INCREMENT_MINS !== 0 || endMins % SLOT_INCREMENT_MINS !== 0) {
    return { data: null, error: `時間必須為 ${SLOT_INCREMENT_MINS} 分鐘的整數倍` }
  }

  const now = new Date()
  const maxTime = new Date(now.getTime() + SLOT_WINDOW_HOURS * 60 * 60 * 1000)

  // Generate all slot timestamps
  const slotsToInsert: { pro_id: string; starts_at: string; is_booked: boolean; is_expired: boolean }[] = []
  let cursor = startMins
  while (cursor < endMins) {
    const h = Math.floor(cursor / 60)
    const m = cursor % 60
    const slotDate = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)

    if (slotDate <= now) {
      cursor += SLOT_INCREMENT_MINS
      continue // skip past slots silently
    }
    if (slotDate > maxTime) {
      return { data: null, error: `時段必須在未來 ${SLOT_WINDOW_HOURS} 小時內` }
    }

    slotsToInsert.push({
      pro_id: proId,
      starts_at: slotDate.toISOString(),
      is_booked: false,
      is_expired: false,
    })
    cursor += SLOT_INCREMENT_MINS
  }

  if (slotsToInsert.length === 0) {
    return { data: null, error: '沒有可新增的時段' }
  }

  const supabase = createAdminClient()

  // Check which timestamps already exist to avoid duplicates
  const timestamps = slotsToInsert.map(s => s.starts_at)
  const { data: existing } = await supabase
    .from('slots')
    .select('starts_at')
    .eq('pro_id', proId)
    .in('starts_at', timestamps)

  const existingSet = new Set((existing ?? []).map(s => s.starts_at))
  const newSlots = slotsToInsert.filter(s => !existingSet.has(s.starts_at))

  if (newSlots.length === 0) {
    return { data: [], error: null } // all already exist, not an error
  }

  const { data, error } = await supabase
    .from('slots')
    .insert(newSlots)
    .select()

  if (error) return { data: null, error: error.message }
  return { data: data as Slot[], error: null }
}

// Remove all unbooked slots by ID. Uses admin client.
// Skips booked slots. Returns error only if ALL are booked.
export async function removeBlock(slotIds: string[]): Promise<Result<null>> {
  if (slotIds.length === 0) return { data: null, error: 'No slots to remove' }

  const supabase = createAdminClient()

  // Fetch booked status for all slots
  const { data: slots } = await supabase
    .from('slots')
    .select('id, is_booked')
    .in('id', slotIds)

  const unbookedIds = (slots ?? []).filter(s => !s.is_booked).map(s => s.id)

  if (unbookedIds.length === 0) {
    return { data: null, error: '此時段已被預約，無法移除' }
  }

  const { error } = await supabase
    .from('slots')
    .delete()
    .in('id', unbookedIds)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── Cross-pro slot matching ──────────────────────────────────

export type TimeBand = 'morning' | 'afternoon' | 'evening'

export type MatchingSlotResult = {
  pro: {
    id: string
    displayName: string
    profilePhotoUrl: string | null
    studioAddress: string
    studioLat: number | null
    studioLng: number | null
    igHandle: string | null
    studioName: string | null
    district: string | null
    portfolioUrls: string[]
  }
  slots: { id: string; startsAt: string; endsAt: string | null; durationMinutes: number }[]
  priceRange: { min: number; max: number }
  distanceKm: number | null
}

// Time band boundaries (hour of day, 24h format)
const TIME_BANDS: Record<TimeBand, { startHour: number; endHour: number }> = {
  morning:   { startHour: 9,  endHour: 12 },
  afternoon: { startHour: 12, endHour: 17 },
  evening:   { startHour: 17, endHour: 22 },
}

/**
 * Filter slots by time band. Exported for unit testing.
 * Returns only slots whose starts_at hour falls within the band.
 * If timeBand is null/undefined, returns all slots unchanged.
 */
export function filterSlotsByTimeBand(
  slots: Slot[],
  timeBand: TimeBand | null | undefined
): Slot[] {
  if (!timeBand) return slots

  const band = TIME_BANDS[timeBand]
  if (!band) return slots

  return slots.filter(slot => {
    const hour = new Date(slot.starts_at).getHours()
    return hour >= band.startHour && hour < band.endHour
  })
}

/**
 * Filter slots by requested dates.
 * Compares the date portion (YYYY-MM-DD) of slot starts_at to the dates array.
 */
export function filterSlotsByDates(
  slots: Slot[],
  dates: string[]
): Slot[] {
  if (dates.length === 0) return slots

  const dateSet = new Set(dates)
  return slots.filter(slot => {
    const slotDate = toDateKey(new Date(slot.starts_at))
    return dateSet.has(slotDate)
  })
}

/**
 * Cross-pro slot matching: find available slots across all accepting pros
 * that match the given service domain, dates, time band, and distance criteria.
 *
 * Returns results sorted by soonest slot first, grouped by pro.
 */
export async function getMatchingSlots(
  criteria: {
    domain: 'nails' | 'lashes'
    categoryIds?: string[]
    styleId?: string | null
    lat?: number | null
    lng?: number | null
    dates: string[]           // ISO date strings (YYYY-MM-DD)
    timeBand?: TimeBand | null
    maxDistanceKm?: number
  },
  supabase: SupabaseClient
): Promise<MatchingSlotResult[]> {
  // 1. Get all approved, accepting, non-suspended pros
  const { data: prosData } = await supabase
    .from('pros')
    .select('*')
    .eq('is_approved', true)
    .eq('is_accepting', true)
    .neq('standing', 'suspended')
    .order('created_at', { ascending: false })

  const pros = prosData ?? []
  if (pros.length === 0) return []

  // 2. For each pro, check if they offer services in the requested domain
  //    by querying pro_services joined to service_categories to filter by domain
  const proIds = pros.map(p => p.id)

  // First, get category IDs that match the requested domain
  const { data: domainCategories } = await supabase
    .from('service_categories')
    .select('id')
    .eq('domain', criteria.domain)

  const domainCategoryIds = (domainCategories ?? []).map(c => c.id)
  if (domainCategoryIds.length === 0) return []

  // Filter pro_services by domain categories (and optionally by specific categoryIds)
  const targetCategoryIds = (criteria.categoryIds && criteria.categoryIds.length > 0)
    ? criteria.categoryIds.filter(id => domainCategoryIds.includes(id))
    : domainCategoryIds

  if (targetCategoryIds.length === 0) return []

  const { data: proServices } = await supabase
    .from('pro_services')
    .select('pro_id, category_id')
    .in('pro_id', proIds)
    .eq('is_enabled', true)
    .in('category_id', targetCategoryIds)

  // Build set of pro IDs that have matching services
  const matchingProIds = new Set((proServices ?? []).map(ps => ps.pro_id))
  const matchingPros = pros.filter(p => matchingProIds.has(p.id))

  if (matchingPros.length === 0) return []

  // 3. Filter by distance if lat/lng provided
  let prosWithDistance = matchingPros.map(p => {
    let distanceKm: number | null = null
    if (
      criteria.lat != null && criteria.lng != null &&
      p.studio_lat != null && p.studio_lng != null
    ) {
      distanceKm = haversineKm(criteria.lat, criteria.lng, p.studio_lat, p.studio_lng)
    }
    return { ...p, distanceKm }
  })

  if (criteria.maxDistanceKm != null) {
    prosWithDistance = prosWithDistance.filter(p =>
      p.distanceKm !== null && p.distanceKm <= criteria.maxDistanceKm!
    )
  }

  if (prosWithDistance.length === 0) return []

  // 4. For each matching pro, fetch available slots in parallel
  const now = new Date().toISOString()
  const maxTime = new Date(Date.now() + SLOT_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const slotResults = await Promise.all(
    prosWithDistance.map(async (pro) => {
      const { data: slots } = await supabase
        .from('slots')
        .select('*')
        .eq('pro_id', pro.id)
        .eq('is_booked', false)
        .eq('is_expired', false)
        .gte('starts_at', now)
        .lte('starts_at', maxTime)
        .order('starts_at', { ascending: true })

      return { pro, slots: (slots ?? []) as Slot[] }
    })
  )

  // 5. Get price ranges per pro in parallel
  //    Query pro_services for each pro's prices in the requested domain
  const categoryIds = criteria.categoryIds ?? []

  const results: MatchingSlotResult[] = []

  for (const { pro, slots } of slotResults) {
    // Filter by requested dates
    let filtered = filterSlotsByDates(slots, criteria.dates)

    // Filter by time band
    filtered = filterSlotsByTimeBand(filtered, criteria.timeBand)

    if (filtered.length === 0) continue

    // Get price range for this pro
    let priceQuery = supabase
      .from('pro_services')
      .select('price_ntd')
      .eq('pro_id', pro.id)
      .eq('is_enabled', true)

    if (categoryIds.length > 0) {
      priceQuery = priceQuery.in('category_id', categoryIds)
    }

    const { data: priceData } = await priceQuery
    const prices = (priceData ?? []).map(r => r.price_ntd)
    const priceRange = prices.length > 0
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: 0, max: 0 }

    results.push({
      pro: {
        id: pro.id,
        displayName: pro.display_name,
        profilePhotoUrl: pro.profile_photo_url,
        studioAddress: pro.studio_address,
        studioLat: pro.studio_lat,
        studioLng: pro.studio_lng,
        igHandle: pro.ig_handle ?? null,
        studioName: pro.studio_name ?? null,
        district: pro.studio_district ?? null,
        portfolioUrls: pro.portfolio_photos ?? [],
      },
      slots: filtered.map(s => {
        const durationMinutes = s.ends_at
          ? Math.round((new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60000)
          : 60
        return {
          id: s.id,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          durationMinutes,
        }
      }),
      priceRange,
      distanceKm: pro.distanceKm,
    })
  }

  // 6. Sort: soonest slot first (primary), then by pro
  results.sort((a, b) => {
    const aEarliest = a.slots[0]?.startsAt ?? ''
    const bEarliest = b.slots[0]?.startsAt ?? ''
    return aEarliest.localeCompare(bEarliest)
  })

  return results
}
