'use client'

import { useState } from 'react'
import type { ServiceCategory, LashSpecialFiberTag, LashDensity } from '@/types/database'

type Props = {
  categories: ServiceCategory[]
  fiberTags: LashSpecialFiberTag[]
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

const FILL_IN_RANGES = [
  { value: 14, label: '≤14 天' },
  { value: 18, label: '15–21 天' },
  { value: 22, label: '>21 天' },
]

// Direction options (not DB entities — stored as free-text preference)
const DIRECTIONS = [
  { id: 'japanese', label: '日式' },
  { id: 'korean', label: '韓式' },
  { id: 'western', label: '歐美' },
  { id: 'neo-chinese', label: '新中式' },
  { id: 'special-fiber', label: '特殊毛種' },
  { id: 'unsure', label: '不確定' },
]

// Density options matching the lash_density DB enum
const DENSITIES: { value: LashDensity; label: string }[] = [
  { value: 'light', label: '自然輕盈' },
  { value: 'daily', label: '日常妝感' },
  { value: 'heavy', label: '極致濃密' },
]

// Neo-Chinese style tags (stored as text[] in lash_style_tags column)
const NEO_CHINESE_STYLES = [
  { id: 'fox', label: '狐系' },
  { id: 'comic', label: '漫畫款' },
  { id: 'fairy', label: '仙女款' },
  { id: 'sunflower', label: '太陽花' },
  { id: 'fringe', label: '流蘇' },
]

// Identify categories by name_zh for conditional UI behavior
function isRemovalCategory(c: ServiceCategory): boolean {
  return c.name_zh === '卸睫'
}

function getSelectedCategoryName(categories: ServiceCategory[], id: string | null): string | null {
  if (!id) return null
  return categories.find(c => c.id === id)?.name_zh ?? null
}

export default function LashesServiceStep({
  categories,
  fiberTags,
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

  // Split categories into main services vs addons
  const mainServices = categories.filter(c => !c.is_addon && !isRemovalCategory(c))
  const removalCategory = categories.find(isRemovalCategory)
  const addonCategories = categories.filter(c => c.is_addon)
  const newSetCategory = categories.find(c => c.name_zh === '嫁接')

  const selectedName = getSelectedCategoryName(categories, selectedService)

  function handleServiceSelect(id: string) {
    if (removalCategory && id === removalCategory.id) {
      onRemovalToggle(!removalAdded)
      return
    }
    if (selectedService === id) {
      onServiceChange(null)
    } else {
      onServiceChange(id)
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
    if (newSetCategory) {
      onServiceChange(newSetCategory.id)
    }
    onFillInDaysChange(null)
  }

  function toggleStyleTag(id: string) {
    if (styleTags.includes(id)) {
      onStyleTagsChange(styleTags.filter(t => t !== id))
    } else {
      onStyleTagsChange([...styleTags, id])
    }
  }

  function toggleAddon(id: string) {
    if (addons.includes(id)) {
      onAddonsChange(addons.filter(a => a !== id))
    } else {
      onAddonsChange([...addons, id])
    }
  }

  const showFillIn = selectedName === '補睫'
  const showDirection = selectedName === '嫁接' || selectedName === '補睫'
  const showDensity = showDirection && directionId !== null && directionId !== 'unsure'
  const showNeoChineseStyles = directionId === 'neo-chinese'
  const showSpecialFibers = directionId === 'special-fiber'
  const showAddons = selectedName === '嫁接' || selectedName === '補睫'

  // Combine main services + removal into one list for rendering
  const allDisplayServices = [
    ...mainServices,
    ...(removalCategory ? [removalCategory] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Main service selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">你需要什麼服務？</h2>
        <p className="text-xs text-muted-foreground">卸睫可與其他服務同時選擇</p>

        <div className="flex flex-wrap gap-2">
          {allDisplayServices.map(s => {
            const isActive = isRemovalCategory(s) ? removalAdded : selectedService === s.id
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
                {s.name_zh}
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

      {/* Special fiber tags — from DB */}
      {showSpecialFibers && fiberTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">特殊毛種（選填）</p>
          <div className="flex flex-wrap gap-2">
            {fiberTags.map(f => {
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
                  {f.name_zh}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Add-ons — from DB (addon categories for lashes domain) */}
      {showAddons && addonCategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">加購項目（選填）</p>
          <div className="flex flex-wrap gap-2">
            {addonCategories.map(a => (
              <button
                key={a.id}
                onClick={() => toggleAddon(a.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  addons.includes(a.id)
                    ? 'border-foreground bg-foreground text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-foreground/30'
                }`}
              >
                {a.name_zh}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
