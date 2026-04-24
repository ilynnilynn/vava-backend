'use client'

import type { DateOption } from '../FilteringWizard'

type Props = {
  selected: DateOption[]
  onToggle: (date: DateOption) => void
}

function generateDateOptions(): { value: DateOption; label: string; sublabel: string }[] {
  const options: { value: DateOption; label: string; sublabel: string }[] = [
    { value: 'now', label: '現在', sublabel: '1小時內' },
  ]

  const now = new Date()
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

  for (let i = 0; i < 3; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    d.setHours(0, 0, 0, 0)
    const iso = d.toISOString().split('T')[0]
    const mm = d.getMonth() + 1
    const dd = d.getDate()

    let label: string
    if (i === 0) label = '今天'
    else if (i === 1) label = '明天'
    else label = `星期${dayNames[d.getDay()]}`

    options.push({
      value: iso,
      label,
      sublabel: `${mm}/${dd}`,
    })
  }

  return options
}

export default function DateStep({ selected, onToggle }: Props) {
  const options = generateDateOptions()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">什麼時候？</h2>

      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-foreground bg-foreground text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-foreground/30'
              }`}
            >
              <span>{opt.label}</span>
              <span className={`ml-1 text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {opt.sublabel}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
