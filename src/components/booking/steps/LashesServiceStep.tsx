'use client'

import { useState } from 'react'

type Props = {
  selectedService: string | null
  removalAdded: boolean
  fillInDays: number | null
  directionId: string | null
  density: string | null
  styleTags: string[]
  fiberTagId: string | null
  addons: string[]
  onServiceChange: (id: string | null) => void
  onRemovalToggle: (on: boolean) => void
  onFillInDaysChange: (days: number | null) => void
  onDirectionChange: (id: string | null) => void
  onDensityChange: (density: string | null) => void
  onStyleTagsChange: (tags: string[]) => void
  onFiberTagChange: (id: string | null) => void
  onAddonsChange: (addons: string[]) => void
}

const LASH_SERVICES = [
  { id: 'new-set', label: '嫁接' },
  { id: 'fill-in', label: '補睫' },
  { id: 'removal', label: '卸睫' },
  { id: 'management', label: '睫毛管理' },
]

const FILL_IN_RANGES = [
  { value: 14, label: '≤14 天' },
  { value: 18, label: '15–21 天' },
  { value: 22, label: '>21 天' },
]

const DIRECTIONS = [
  { id: 'japanese', label: '日式' },
  { id: 'korean', label: '韓式' },
  { id: 'western', label: '歐美' },
  { id: 'neo-chinese', label: '新中式' },
  { id: 'special-fiber', label: '特殊毛種' },
  { id: 'unsure', label: '不確定' },
]

const DENSITIES = [
  { value: 'light', label: '自然輕盈' },
  { value: 'natural', label: '日常妝感' },
  { value: 'full', label: '極致濃密' },
]

const NEO_CHINESE_STYLES = [
  { id: 'fox', label: '狐系' },
  { id: 'comic', label: '漫畫款' },
  { id: 'fairy', label: '仙女款' },
  { id: 'sunflower', label: '太陽花' },
  { id: 'fringe', label: '流蘇' },
]

const SPECIAL_FIBERS = [
  { id: 'camellia', label: '山茶花' },
  { id: 'mermaid-yy', label: '人魚編織(YY)' },
  { id: '6d-feather', label: '6D羽毛' },
  { id: '6d-cotton', label: '6D棉花' },
  { id: 'clover', label: '三葉草' },
]

export default function LashesServiceStep({
  selectedService,
  removalAdded,
  fillInDays,
  directionId,
  density,
  styleTags,
  fiberTagId,
  addons,
  onServiceChange,
  onRemovalToggle,
  onFillInDaysChange,
  onDirectionChange,
  onDensityChange,
  onStyleTagsChange,
  onFiberTagChange,
  onAddonsChange,
}: Props) {
  const [showRedirectWarning, setShowRedirectWarning] = useState(false)

  function handleServiceSelect(id: string) {
    if (id === 'removal') {
      // 卸睫 is multi-selectable with others
      onRemovalToggle(!removalAdded)
      return
    }
    // Single select for others
    if (selectedService === id) {
      onServiceChange(null)
    } else {
      onServiceChange(id)
      // Clear conditional fields
      onFillInDaysChange(null)
    }
  }

  function handleFillInDays(days: number) {
    if (days > 21) {
      setShowRedirectWarning(true)
      return
    }
    onFillInDaysChange(fillInDays === days ? null : days)
  }

  function handleRedirectToNewSet() {
    setShowRedirectWarning(false)
    onServiceChange('new-set')
    onFillInDaysChange(null)
  }

  function toggleStyleTag(id: string) {
    if (styleTags.includes(id)) {
      onStyleTagsChange(styleTags.filter(t => t !== id))
    } else {
      onStyleTagsChange([...styleTags, id])
    }
  }

  function toggleAddon(addon: string) {
    if (addons.includes(addon)) {
      onAddonsChange(addons.filter(a => a !== addon))
    } else {
      onAddonsChange([...addons, addon])
    }
  }

  const showFillIn = selectedService === 'fill-in'
  const showDirection = selectedService === 'new-set' || selectedService === 'fill-in'
  const showDensity = showDirection && directionId !== null && directionId !== 'unsure'
  const showNeoChineseStyles = directionId === 'neo-chinese'
  const showSpecialFibers = directionId === 'special-fiber'
  const showAddons = selectedService === 'new-set' || selectedService === 'fill-in'

  return (
    <div className="space-y-6">
      {/* Main service selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">你需要什麼服務？</h2>
        <p className="text-xs text-muted-foreground">卸睫可與其他服務同時選擇</p>

        <div className="flex flex-wrap gap-2">
          {LASH_SERVICES.map(s => {
            const isActive = s.id === 'removal' ? removalAdded : selectedService === s.id
            return (
              <button
                key={s.id}
                onClick={() => handleServiceSelect(s.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-foreground bg-foreground text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-foreground/30'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Fill-in days — inline below 補睫 */}
      {showFillIn && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">距上次嫁接多久？</p>
          <div className="flex gap-2">
            {FILL_IN_RANGES.map(r => {
              const isActive = fillInDays === r.value
              return (
                <button
                  key={r.value}
                  onClick={() => handleFillInDays(r.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* >21 day warning popup */}
      {showRedirectWarning && (
        <div className="rounded-xl border border-warning bg-warning-muted p-4 space-y-3">
          <p className="text-sm text-warning-foreground">
            超過 21 天建議重新嫁接，補睫效果可能不佳。
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRedirectToNewSet}
              className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              改為嫁接
            </button>
            <button
              onClick={() => setShowRedirectWarning(false)}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground"
            >
              返回
            </button>
          </div>
        </div>
      )}

      {/* Direction — optional */}
      {showDirection && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">方向偏好（選填）</p>
          <div className="flex flex-wrap gap-2">
            {DIRECTIONS.map(d => {
              const isActive = directionId === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => onDirectionChange(isActive ? null : d.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Density — optional, after direction */}
      {showDensity && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">濃密度（選填）</p>
          <div className="flex gap-2">
            {DENSITIES.map(d => {
              const isActive = density === d.value
              return (
                <button
                  key={d.value}
                  onClick={() => onDensityChange(isActive ? null : d.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Neo-Chinese style tags */}
      {showNeoChineseStyles && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">風格標籤（選填）</p>
          <div className="flex flex-wrap gap-2">
            {NEO_CHINESE_STYLES.map(s => {
              const isActive = styleTags.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStyleTag(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Special fiber tags */}
      {showSpecialFibers && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">特殊毛種（選填）</p>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_FIBERS.map(f => {
              const isActive = fiberTagId === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => onFiberTagChange(isActive ? null : f.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Add-ons — only for 嫁接/補睫 */}
      {showAddons && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">加購項目（選填）</p>
          <button
            onClick={() => toggleAddon('lower-lashes')}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              addons.includes('lower-lashes')
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            下睫毛
          </button>
        </div>
      )}
    </div>
  )
}
