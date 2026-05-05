import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  const cols = [
    'id', 'user_id', 'pro_id', 'slot_id', 'status', 'created_at', 'updated_at',
    'price_min', 'price_max', 'service_category_ids', 'style_id',
    'starts_at', 'session_ends_at', 'no_show_window_minutes',
    'cancelled_at', 'cancellation_actor', 'completed_at',
    'preference', 'customer_note', 'early_completion',
    'lash_density', 'nail_scope', 'addon_ids', 'treatment_tier',
    'briefing_ref_photo_url', 'no_show_reported_at', 'no_show_reporter',
    'reminder_sent_at', 'rating_prompt_sent_at', 'rating_prompt_sent',
    'nail_package_id', 'fill_in_days', 'is_returning_customer',
    'lash_special_fiber_tag_id', 'lash_style_tags',
  ]
  const found: string[] = []
  for (const col of cols) {
    const { error } = await admin.from('bookings').select(col).limit(1)
    if (!error) found.push(col)
  }
  console.log('bookings columns:', found.join(', '))
}
main()
