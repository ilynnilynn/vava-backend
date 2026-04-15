import type { BookingRequestState } from './booking-context'

export function buildRequestSummary(state: BookingRequestState): string {
  const parts: string[] = []

  // Category
  if (state.category === 'nails') parts.push('美甲')
  if (state.category === 'lashes') parts.push('美睫')

  // Services
  if (state.services?.categoryIds?.length) {
    parts.push(state.services.categoryIds.join('・'))
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
