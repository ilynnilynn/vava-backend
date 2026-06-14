// ============================================================
// /admin/pros — Pro Management
//
// List all pros with status filters. Supports viewing details,
// suspension, and status management.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { ProTable } from './ProTable'

export default async function AdminProsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const admin = createAdminClient()

  let query = admin
    .from('pros')
    .select('id, display_name, phone, ig_handle, studio_address, studio_district, is_approved, is_suspended, is_accepting, standing, subscription_status, confirmed_booking_count, verification_status, submitted_at, reviewed_at, created_at')
    .order('created_at', { ascending: false })

  // Apply status filter
  const statusFilter = params.status ?? 'all'
  if (statusFilter === 'active') {
    query = query.eq('is_approved', true).eq('is_suspended', false)
  } else if (statusFilter === 'pending') {
    query = query.eq('verification_status', 'pending')
  } else if (statusFilter === 'suspended') {
    query = query.eq('is_suspended', true)
  } else if (statusFilter === 'declined') {
    query = query.eq('verification_status', 'declined')
  }

  const { data: pros, error } = await query
  if (error) console.error('[admin/pros] query error:', error)

  // Get flag counts per pro for the displayed pros
  const proIds = (pros ?? []).map(p => p.id)
  const flagCounts: Record<string, number> = {}
  if (proIds.length > 0) {
    const { data: flags } = await admin
      .from('flags')
      .select('flagged_id')
      .eq('flagged_entity', 'pro')
      .in('flagged_id', proIds)
    for (const f of flags ?? []) {
      flagCounts[f.flagged_id] = (flagCounts[f.flagged_id] ?? 0) + 1
    }
  }

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'declined', label: 'Declined' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pro Management</h2>
        <span className="text-sm text-muted-foreground">{(pros ?? []).length} pros</span>
      </div>

      {/* Status filters */}
      <div className="flex gap-1">
        {filters.map(f => (
          <a
            key={f.key}
            href={`/admin/pros${f.key === 'all' ? '' : `?status=${f.key}`}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              statusFilter === f.key
                ? 'bg-foreground/8 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <ProTable pros={pros ?? []} flagCounts={flagCounts} />
    </div>
  )
}
