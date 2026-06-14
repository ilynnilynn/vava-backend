// ============================================================
// /admin/flags — Flag Management
//
// Review flagged users and pros. Supports resolution workflow
// and ban/warn actions.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { FlagTable } from './FlagTable'

export default async function AdminFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>
}) {
  const params = await searchParams
  const admin = createAdminClient()

  const entityFilter = params.entity ?? 'all'

  let query = admin
    .from('flags')
    .select('id, booking_id, flagged_entity, flagged_id, flag_type, is_same_day, note, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (entityFilter === 'pro') {
    query = query.eq('flagged_entity', 'pro')
  } else if (entityFilter === 'customer') {
    query = query.eq('flagged_entity', 'customer')
  }

  const { data: flags, error } = await query
  if (error) console.error('[admin/flags] query error:', error)

  // Resolve flagged entity names
  const proIds = [...new Set((flags ?? []).filter(f => f.flagged_entity === 'pro').map(f => f.flagged_id))]
  const userIds = [...new Set((flags ?? []).filter(f => f.flagged_entity === 'customer').map(f => f.flagged_id))]

  const [{ data: pros }, { data: users }] = await Promise.all([
    proIds.length > 0
      ? admin.from('pros').select('id, display_name, standing, is_suspended').in('id', proIds)
      : { data: [] },
    userIds.length > 0
      ? admin.from('users').select('id, name').in('id', userIds)
      : { data: [] },
  ])

  const entityNames: Record<string, string> = {}
  for (const p of pros ?? []) entityNames[p.id] = p.display_name
  for (const u of users ?? []) entityNames[u.id] = u.name

  const proStandings: Record<string, { standing: string; is_suspended: boolean }> = {}
  for (const p of pros ?? []) proStandings[p.id] = { standing: p.standing, is_suspended: p.is_suspended }

  // Compute flag counts per entity for summary
  const flagCountByEntity: Record<string, number> = {}
  for (const f of flags ?? []) {
    flagCountByEntity[f.flagged_id] = (flagCountByEntity[f.flagged_id] ?? 0) + 1
  }

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'pro', label: 'Pros' },
    { key: 'customer', label: 'Customers' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Flag Management</h2>
        <span className="text-sm text-muted-foreground">{(flags ?? []).length} flags</span>
      </div>

      {/* Entity filters */}
      <div className="flex gap-1">
        {filters.map(f => (
          <a
            key={f.key}
            href={`/admin/flags${f.key === 'all' ? '' : `?entity=${f.key}`}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              entityFilter === f.key
                ? 'bg-foreground/8 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <FlagTable
        flags={flags ?? []}
        entityNames={entityNames}
        proStandings={proStandings}
        flagCountByEntity={flagCountByEntity}
      />
    </div>
  )
}
