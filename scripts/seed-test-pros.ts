// ============================================================
// VAVA — Seed 10 Test Pro Profiles for Search Testing
//
// Creates fully-populated pro profiles visible in customer search.
// Idempotent: skips if test-pro-1@vava.test already exists.
//
// Run: npx tsx scripts/seed-test-pros.ts
// ============================================================

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local first (Next.js convention), fall back to .env
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Test data ────────────────────────────────────────────────

const PRO_COUNT = 10
const PASSWORD = 'testpass123'

// Nail portfolio photos (Unsplash, free to use)
const NAIL_PHOTOS = [
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&h=400&fit=crop',
]

// Lash/beauty portfolio photos
const LASH_PHOTOS = [
  'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1588352503261-6547be31e1d3?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop',
]

const PRO_PROFILES = [
  { name: '林美甲', address: '台北市大安區忠孝東路四段100號', ig: 'lin_nails', scope: 'both' as const, gender: 'female', domain: 'nails' as const },
  { name: '陳睫毛', address: '台北市信義區松仁路50號', ig: 'chen_lash', scope: null, gender: 'female', domain: 'lashes' as const },
  { name: '王指彩', address: '台北市中山區南京東路二段30號', ig: 'wang_nails', scope: 'hands' as const, gender: 'female', domain: 'nails' as const },
  { name: '張美睫', address: '台北市松山區八德路三段88號', ig: 'zhang_lash', scope: null, gender: 'female', domain: 'lashes' as const },
  { name: '李凝膠', address: '台北市中正區羅斯福路一段20號', ig: 'li_gel', scope: 'both' as const, gender: 'female', domain: 'nails' as const },
  { name: '黃嫁接', address: '台北市大同區承德路二段15號', ig: 'huang_lash', scope: null, gender: 'female', domain: 'lashes' as const },
  { name: '吳法式', address: '台北市萬華區西園路一段60號', ig: 'wu_french', scope: 'hands' as const, gender: 'female', domain: 'nails' as const },
  { name: '趙美業', address: '台北市內湖區成功路四段25號', ig: 'zhao_beauty', scope: 'both' as const, gender: 'other', domain: 'nails' as const },
  { name: '周光療', address: '台北市士林區中正路200號', ig: 'zhou_uv', scope: 'feet' as const, gender: 'female', domain: 'nails' as const },
  { name: '鄭全能', address: '台北市北投區中和街10號', ig: 'zheng_all', scope: 'both' as const, gender: 'male', domain: 'nails' as const },
]

// Which pros get which service types:
// 0,2,4,6,8 → nails, 1,3,5 → lashes, 7,9 → both
const PRO_SERVICE_CONFIG: { domains: ('nails' | 'lashes')[]; noShowWindow: number }[] = [
  { domains: ['nails'], noShowWindow: 15 },
  { domains: ['lashes'], noShowWindow: 10 },
  { domains: ['nails'], noShowWindow: 20 },
  { domains: ['lashes'], noShowWindow: 15 },
  { domains: ['nails'], noShowWindow: 15 },
  { domains: ['lashes'], noShowWindow: 10 },
  { domains: ['nails'], noShowWindow: 20 },
  { domains: ['nails', 'lashes'], noShowWindow: 15 },
  { domains: ['nails'], noShowWindow: 15 },
  { domains: ['nails', 'lashes'], noShowWindow: 10 },
]

// ── Helpers ──────────────────────────────────────────────────

/** Generate 15-min-aligned slot times across the next 3 days within work hours */
function generateSlotTimes(count: number, workStart = 10, workEnd = 20): Date[] {
  const slots: Date[] = []
  const now = new Date()

  for (let dayOffset = 0; dayOffset < 3 && slots.length < count; dayOffset++) {
    const day = new Date(now)
    day.setDate(day.getDate() + dayOffset + 1) // start tomorrow
    day.setHours(workStart, 0, 0, 0)

    // Pick evenly-spaced slots through the work day
    const totalSlots = (workEnd - workStart) * 4 // 15-min increments
    const step = Math.max(1, Math.floor(totalSlots / Math.ceil(count / 3)))

    for (let i = 0; i < totalSlots && slots.length < count; i += step) {
      const slot = new Date(day)
      slot.setMinutes(i * 15)
      if (slot > now) {
        slots.push(slot)
      }
    }
  }

  return slots
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('Seeding test pros for VAVA search testing...\n')

  // ── 0. Idempotency check ──────────────────────────────────
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const alreadySeeded = existingUsers?.users?.some(
    u => u.email === 'test-pro-1@vava.test'
  )
  if (alreadySeeded) {
    console.log('Already seeded (test-pro-1@vava.test exists). Skipping.')
    return
  }

  // ── 1. Create auth users ──────────────────────────────────
  console.log('Creating auth users...')

  const authUserIds: string[] = []
  for (let i = 1; i <= PRO_COUNT; i++) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `test-pro-${i}@vava.test`,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create auth user ${i}: ${error.message}`)
    authUserIds.push(data.user.id)
  }
  console.log(`  ${authUserIds.length} pro auth users created`)

  // Create 1 test customer
  const { data: customerAuth, error: customerErr } = await admin.auth.admin.createUser({
    email: 'test-customer@vava.test',
    password: PASSWORD,
    email_confirm: true,
  })
  if (customerErr) throw new Error(`Failed to create customer auth user: ${customerErr.message}`)
  const customerUserId = customerAuth.user.id
  console.log('  1 customer auth user created')

  // ── 2. Activate service categories ────────────────────────
  console.log('Checking service categories...')

  const { data: existingCategories } = await admin
    .from('service_categories')
    .select('id')
    .limit(1)

  let nailCategoryIds: string[] = []
  let lashCategoryIds: string[] = []

  if (existingCategories && existingCategories.length > 0) {
    console.log('  Service categories exist — activating all...')
    // Ensure all categories are active (Notion sync may leave is_active = false)
    await admin
      .from('service_categories')
      .update({ is_active: true })
      .eq('is_active', false)

    const { data: nailCats } = await admin
      .from('service_categories')
      .select('id')
      .eq('domain', 'nails')
    const { data: lashCats } = await admin
      .from('service_categories')
      .select('id')
      .eq('domain', 'lashes')
    nailCategoryIds = (nailCats ?? []).map(c => c.id)
    lashCategoryIds = (lashCats ?? []).map(c => c.id)
  } else {
    console.log('  Seeding service categories...')
    const categories = [
      { name_zh: '凝膠', domain: 'nails', sort_order: 0, is_active: true, has_styles: true, is_standalone: true },
      { name_zh: '卸甲', domain: 'nails', sort_order: 1, is_active: true, has_styles: false, is_standalone: true },
      { name_zh: '光療', domain: 'nails', sort_order: 2, is_active: true, has_styles: true, is_standalone: true },
      { name_zh: '手足保養', domain: 'nails', sort_order: 3, is_active: true, has_styles: false, is_standalone: true },
      { name_zh: '凝膠延甲', domain: 'nails', sort_order: 4, is_active: true, has_styles: false, is_standalone: false },
      { name_zh: '法式', domain: 'nails', sort_order: 5, is_active: true, has_styles: true, is_standalone: true },
      { name_zh: '嫁接', domain: 'lashes', sort_order: 0, is_active: true, has_styles: true, is_standalone: true },
      { name_zh: '補睫', domain: 'lashes', sort_order: 1, is_active: true, has_styles: true, is_standalone: true },
      { name_zh: '卸睫', domain: 'lashes', sort_order: 2, is_active: true, has_styles: false, is_standalone: true },
      { name_zh: '山茶花', domain: 'lashes', sort_order: 3, is_active: true, has_styles: true, is_standalone: true },
    ]
    const { data: inserted, error: catErr } = await admin
      .from('service_categories')
      .insert(categories)
      .select('id, domain')
    if (catErr) throw new Error(`Failed to seed categories: ${catErr.message}`)
    for (const row of inserted ?? []) {
      if (row.domain === 'nails') nailCategoryIds.push(row.id)
      else lashCategoryIds.push(row.id)
    }
  }

  console.log(`  Nails: ${nailCategoryIds.length} categories, Lashes: ${lashCategoryIds.length} categories`)

  if (nailCategoryIds.length === 0 && lashCategoryIds.length === 0) {
    throw new Error('No service categories found or seeded. Cannot continue.')
  }

  // ── 3. Activate service style modifiers ───────────────────
  console.log('Checking style modifiers...')

  const { data: existingStyles } = await admin
    .from('service_style_modifiers')
    .select('id')
    .limit(1)

  if (existingStyles && existingStyles.length > 0) {
    console.log('  Style modifiers exist — activating all...')
    await admin
      .from('service_style_modifiers')
      .update({ is_active: true })
      .eq('is_active', false)
  } else {
    console.log('  Seeding style modifiers...')
    const styles = [
      { key: 'japanese', name_zh: '日式', name_en: 'Japanese', service_type: 'nails', sort_order: 0, is_active: true },
      { key: 'korean', name_zh: '韓式', name_en: 'Korean', service_type: 'nails', sort_order: 1, is_active: true },
      { key: 'natural', name_zh: '自然', name_en: 'Natural', service_type: 'lashes', sort_order: 0, is_active: true },
      { key: 'dense', name_zh: '濃密', name_en: 'Dense', service_type: 'lashes', sort_order: 1, is_active: true },
    ]
    const { error: styleErr } = await admin
      .from('service_style_modifiers')
      .insert(styles)
    if (styleErr) throw new Error(`Failed to seed style modifiers: ${styleErr.message}`)
    console.log(`  ${styles.length} style modifiers seeded`)
  }

  // ── 4. Insert pros ────────────────────────────────────────
  // pros.id = auth user id (no separate user_id column in deployed schema)
  console.log('Inserting pro profiles...')

  const proRows = PRO_PROFILES.map((p, i) => ({
    id: authUserIds[i],
    display_name: p.name,
    phone: `09${String(10000000 + i).slice(1)}`,
    line_user_id: `test_line_pro_${i + 1}`,
    studio_address: p.address,
    ig_handle: p.ig,
    nail_scope: p.scope,
    gender: p.gender,
    portfolio_photos: (() => {
      const pool = p.domain === 'lashes' ? LASH_PHOTOS : NAIL_PHOTOS
      return [pool[i % pool.length], pool[(i + 1) % pool.length], pool[(i + 2) % pool.length]]
    })(),
    is_approved: true,
    is_accepting: true,
    standing: 'good',
    no_show_window_minutes: PRO_SERVICE_CONFIG[i].noShowWindow,
    work_start_hour: 10,
    work_end_hour: 20,
    submitted_at: new Date().toISOString(),
    confirmed_booking_count: 0,
    subscription_status: 'free',
  }))

  const { data: insertedPros, error: proErr } = await admin
    .from('pros')
    .insert(proRows)
    .select('id')

  if (proErr) throw new Error(`Failed to insert pros: ${proErr.message}`)
  const proIds = (insertedPros ?? []).map(p => p.id)
  console.log(`  ${proIds.length} pros inserted`)

  // ── 5. Insert pro services ────────────────────────────────
  console.log('Inserting pro services...')

  const proServiceRows: {
    pro_id: string
    category_id: string
    price_ntd: number
    duration_minutes: number
    is_enabled: boolean
  }[] = []

  for (let i = 0; i < PRO_COUNT; i++) {
    const config = PRO_SERVICE_CONFIG[i]
    const proId = proIds[i]

    for (const domain of config.domains) {
      const categoryPool = domain === 'nails' ? nailCategoryIds : lashCategoryIds
      if (categoryPool.length === 0) continue

      // Pick 2-3 categories from the pool
      const count = Math.min(randomInt(2, 3), categoryPool.length)
      const shuffled = [...categoryPool].sort(() => Math.random() - 0.5)
      const picked = shuffled.slice(0, count)

      for (const categoryId of picked) {
        proServiceRows.push({
          pro_id: proId,
          category_id: categoryId,
          price_ntd: randomInt(5, 15) * 100, // 500-1500 NTD
          duration_minutes: [45, 60, 75, 90][randomInt(0, 3)],
          is_enabled: true,
        })
      }
    }
  }

  const { error: psErr } = await admin
    .from('pro_services')
    .insert(proServiceRows)

  if (psErr) throw new Error(`Failed to insert pro services: ${psErr.message}`)
  console.log(`  ${proServiceRows.length} pro services inserted`)

  // ── 6. Insert slots ───────────────────────────────────────
  console.log('Inserting slots...')

  let totalSlots = 0
  for (const proId of proIds) {
    const slotCount = randomInt(8, 12)
    const slotTimes = generateSlotTimes(slotCount)

    const slotRows = slotTimes.map(t => ({
      pro_id: proId,
      starts_at: t.toISOString(),
      is_booked: false,
      is_expired: false,
    }))

    const { error: slotErr } = await admin
      .from('slots')
      .insert(slotRows)

    if (slotErr) throw new Error(`Failed to insert slots for pro ${proId}: ${slotErr.message}`)
    totalSlots += slotRows.length
  }

  console.log(`  ${totalSlots} slots inserted across ${proIds.length} pros`)

  // ── 7. Insert test customer ───────────────────────────────
  // users table uses `name` (not `display_name`)
  console.log('Inserting test customer...')

  const { error: custErr } = await admin.from('users').insert({
    id: customerUserId,
    name: '測試顧客',
    phone: '0900000000',
    line_user_id: 'test_line_customer_1',
  })

  if (custErr) throw new Error(`Failed to insert customer: ${custErr.message}`)
  console.log('  1 test customer inserted')

  // ── Summary ───────────────────────────────────────────────
  console.log('\n--- Seed complete ---')
  console.log(`  Pros:     ${proIds.length}`)
  console.log(`  Services: ${proServiceRows.length}`)
  console.log(`  Slots:    ${totalSlots}`)
  console.log(`  Customer: test-customer@vava.test / ${PASSWORD}`)
  console.log(`  Pro login: test-pro-{1..10}@vava.test / ${PASSWORD}`)
}

main().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
