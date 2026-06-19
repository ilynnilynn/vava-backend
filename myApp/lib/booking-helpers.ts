import type { BookingRequestState } from './booking-context'

export function buildRequestSummary(state: BookingRequestState): string {
  const parts: string[] = []

  // Category
  if (state.category === 'nails') parts.push('美甲')
  if (state.category === 'lashes') parts.push('美睫')

  // Services
  const scopeLines = buildScopeServiceLines(state.services)
  if (scopeLines.length) {
    parts.push(scopeLines.join('、'))
  } else if (state.services?.categoryIds?.length) {
    const cats = filterDisplayCats(state.services.categoryIds, {
      removalType: state.services.removalType,
      treatmentTier: state.services.treatmentTier,
    })
    if (cats.length) parts.push(cats.join(' ・ '))
    if (state.services.removalType) parts.push(`卸甲（${state.services.removalType}）`)
  }

  // Location
  if (state.location?.label) {
    const district = state.location.label.split(/[,，]/)[0]
    parts.push(district)
  }

  // When
  if (state.date === 'now') parts.push('現在')
  else if (state.date) parts.push(state.date)

  if (state.timeBand === 'morning') parts.push('早上')
  if (state.timeBand === 'afternoon') parts.push('下午')
  if (state.timeBand === 'evening') parts.push('傍晚')

  return parts.join(' | ')
}

/**
 * Remove categoryIds that are already represented by a more specific field.
 * - '卸甲' is removed when removalType is set (shown as '卸甲（續做）' instead)
 * - '保養' is removed when treatmentTier is set (shown as '基本保養' instead)
 */
export function filterDisplayCats(
  cats: string[],
  opts: { removalType?: string | null; treatmentTier?: string | null } = {},
): string[] {
  return cats.filter((id) => {
    if (id === '卸甲' && opts.removalType) return false
    if (id === '保養' && opts.treatmentTier) return false
    return true
  })
}

/**
 * Build per-scope service display lines for hand+foot split mode.
 * Returns [] if not in hand+foot mode — caller should fall back to single-scope logic.
 *
 * Removal continuation is determined per-scope:
 * - Scope has other services (gel, style, treatment) + removal → 卸甲（續做）
 * - Scope has removal only → 卸甲（不續做）
 */
export function buildScopeServiceLines(services: BookingRequestState['services']): string[] {
  if (!services) return []
  const { handCategoryIds, footCategoryIds } = services
  if (!handCategoryIds?.length || !footCategoryIds?.length) return []

  return [
    buildOneScopeLine('手部', handCategoryIds, services.handStyleId, services.handTreatmentTier),
    buildOneScopeLine('腳部', footCategoryIds, services.footStyleId, services.footTreatmentTier),
  ]
}

function buildOneScopeLine(
  label: string,
  cats: string[],
  styleId: string | null | undefined,
  tier: string | null | undefined,
): string {
  const hasRemoval = cats.includes('卸甲')
  const displayCats = cats.filter((c) => {
    if (c === '卸甲') return false
    if (c === '保養' && tier) return false
    return true
  })
  const hasOtherServices = displayCats.length > 0 || !!styleId || !!tier

  const parts: string[] = []
  if (styleId) parts.push(styleId)
  parts.push(...displayCats)
  if (tier) parts.push(`${tier}保養`)
  if (hasRemoval) {
    parts.push(`卸甲（${hasOtherServices ? '續做' : '不續做'}）`)
  }

  return parts.length ? `${label} ・ ${parts.join(' ・ ')}` : label
}

export function formatSlotTime(startsAt: string): string {
  const d = new Date(startsAt)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatBookingDate(startsAt: string): string {
  const d = new Date(startsAt)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[d.getDay()]
  return `${month}月${day}日 (${weekday})`
}
