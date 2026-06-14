// ============================================================
// /admin/dashboard — Key Metrics Dashboard
//
// Shows bookings/day, revenue, active pros, growth trends,
// and pro performance rankings.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'

type MetricCard = {
  label: string
  value: string | number
  detail?: string
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  // Fetch all metrics in parallel
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [
    { count: totalPros },
    { count: activePros },
    { count: pendingPros },
    { count: suspendedPros },
    { count: todayBookings },
    { count: weekBookings },
    { count: monthBookings },
    { count: totalBookings },
    { count: completedBookings },
    { count: cancelledBookings },
    { count: noShowBookings },
    { count: openFlags },
    { data: topPros },
  ] = await Promise.all([
    admin.from('pros').select('*', { count: 'exact', head: true }),
    admin.from('pros').select('*', { count: 'exact', head: true }).eq('is_approved', true).eq('is_suspended', false),
    admin.from('pros').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    admin.from('pros').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    admin.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    admin.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    admin.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
    admin.from('bookings').select('*', { count: 'exact', head: true }),
    admin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    admin.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['cancelled_customer', 'cancelled_pro', 'cancelled_grace']),
    admin.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['no_show_customer', 'no_show_pro']),
    admin.from('flags').select('*', { count: 'exact', head: true }),
    admin.from('pros')
      .select('id, display_name, confirmed_booking_count, standing, is_approved, is_suspended')
      .eq('is_approved', true)
      .order('confirmed_booking_count', { ascending: false })
      .limit(10),
  ])

  const proMetrics: MetricCard[] = [
    { label: 'Total Pros', value: totalPros ?? 0 },
    { label: 'Active Pros', value: activePros ?? 0, detail: 'Approved & not suspended' },
    { label: 'Pending Review', value: pendingPros ?? 0 },
    { label: 'Suspended', value: suspendedPros ?? 0 },
  ]

  const bookingMetrics: MetricCard[] = [
    { label: 'Today', value: todayBookings ?? 0 },
    { label: 'This Week', value: weekBookings ?? 0 },
    { label: 'This Month', value: monthBookings ?? 0 },
    { label: 'All Time', value: totalBookings ?? 0 },
  ]

  const statusMetrics: MetricCard[] = [
    { label: 'Completed', value: completedBookings ?? 0 },
    { label: 'Cancelled', value: cancelledBookings ?? 0 },
    { label: 'No-shows', value: noShowBookings ?? 0 },
    { label: 'Flags', value: openFlags ?? 0 },
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      {/* Pro metrics */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Pros</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {proMetrics.map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-2xl font-semibold">{m.value}</p>
              <p className="text-sm text-muted-foreground">{m.label}</p>
              {m.detail && <p className="text-xs text-muted-foreground/70 mt-0.5">{m.detail}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Booking metrics */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Bookings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bookingMetrics.map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-2xl font-semibold">{m.value}</p>
              <p className="text-sm text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Status breakdown */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Status Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusMetrics.map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-2xl font-semibold">{m.value}</p>
              <p className="text-sm text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top pros by completed bookings */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Top Pros (by completed bookings)</h3>
        {(topPros ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
            No approved pros yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Pro</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bookings</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Standing</th>
                </tr>
              </thead>
              <tbody>
                {(topPros ?? []).map((pro, i) => (
                  <tr key={pro.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{pro.display_name}</td>
                    <td className="px-4 py-2">{pro.confirmed_booking_count}</td>
                    <td className="px-4 py-2">
                      <StandingBadge standing={pro.standing} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StandingBadge({ standing }: { standing: string }) {
  const styles: Record<string, string> = {
    good: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    at_risk: 'bg-orange-100 text-orange-800',
    suspended: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[standing] ?? 'bg-gray-100 text-gray-800'}`}>
      {standing.replace('_', ' ')}
    </span>
  )
}
