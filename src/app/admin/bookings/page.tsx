// ============================================================
// /admin/bookings — Booking Oversight
//
// List all bookings with status, date, pro, and customer filters.
// Supports manual intervention (cancel, view details).
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { BookingTable } from './BookingTable'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params = await searchParams
  const admin = createAdminClient()

  const statusFilter = params.status ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const perPage = 25
  const offset = (page - 1) * perPage

  let query = admin
    .from('bookings')
    .select(`
      id,
      user_id,
      pro_id,
      status,
      price_min,
      price_max,
      created_at,
      cancelled_at,
      completed_at,
      no_show_reported_at,
      cancellation_actor,
      no_show_reporter,
      session_ends_at,
      early_completion
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (statusFilter === 'confirmed') {
    query = query.eq('status', 'confirmed')
  } else if (statusFilter === 'completed') {
    query = query.eq('status', 'completed')
  } else if (statusFilter === 'cancelled') {
    query = query.in('status', ['cancelled_customer', 'cancelled_pro', 'cancelled_grace'])
  } else if (statusFilter === 'no_show') {
    query = query.in('status', ['no_show_customer', 'no_show_pro'])
  }

  const { data: bookings, count, error } = await query

  if (error) console.error('[admin/bookings] query error:', error)

  // Resolve pro and user names for the displayed bookings
  const proIds = [...new Set((bookings ?? []).map(b => b.pro_id))]
  const userIds = [...new Set((bookings ?? []).map(b => b.user_id))]

  const [{ data: pros }, { data: users }] = await Promise.all([
    proIds.length > 0
      ? admin.from('pros').select('id, display_name').in('id', proIds)
      : { data: [] },
    userIds.length > 0
      ? admin.from('users').select('id, name').in('id', userIds)
      : { data: [] },
  ])

  const proNames: Record<string, string> = {}
  for (const p of pros ?? []) proNames[p.id] = p.display_name

  const userNames: Record<string, string> = {}
  for (const u of users ?? []) userNames[u.id] = u.name

  const totalPages = Math.ceil((count ?? 0) / perPage)

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'no_show', label: 'No-show' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Booking Oversight</h2>
        <span className="text-sm text-muted-foreground">{count ?? 0} total</span>
      </div>

      {/* Status filters */}
      <div className="flex gap-1">
        {filters.map(f => (
          <a
            key={f.key}
            href={`/admin/bookings${f.key === 'all' ? '' : `?status=${f.key}`}`}
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

      <BookingTable
        bookings={bookings ?? []}
        proNames={proNames}
        userNames={userNames}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/admin/bookings?status=${statusFilter}&page=${page - 1}`}
              className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted/30"
            >
              Previous
            </a>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/bookings?status=${statusFilter}&page=${page + 1}`}
              className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted/30"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}
