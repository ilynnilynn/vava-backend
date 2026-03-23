'use client'

import type { TimeBand } from '../FilteringWizard'

type Props = {
  selected: TimeBand | null
  onSelect: (timeBand: TimeBand) => void
}

const TIME_BANDS: { value: TimeBand; label: string; range: string }[] = [
  { value: 'morning', label: '🌅 早上', range: '9:00–12:00' },
  { value: 'afternoon', label: '☀️ 下午', range: '12:00–17:00' },
  { value: 'evening', label: '🌆 傍晚', range: '17:00–22:00' },
  { value: 'any', label: '不限時段', range: '任何時間' },
]

export default function TimeBandStep({ selected, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">偏好時段</h2>

      <div className="grid grid-cols-2 gap-3">
        {TIME_BANDS.map(tb => {
          const isActive = selected === tb.value
          return (
            <button
              key={tb.value}
              onClick={() => onSelect(tb.value)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                isActive
                  ? 'border-foreground bg-foreground text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-foreground/30'
              }`}
            >
              <span className="block text-base font-semibold">{tb.label}</span>
              <span className={`block text-xs mt-0.5 ${
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {tb.range}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
