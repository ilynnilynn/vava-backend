'use client'

import type { ServiceCategory, ServiceStyleModifier } from '@/types/database'

type Props = {
  categories: ServiceCategory[]
  styleModifiers: ServiceStyleModifier[]
  selectedServices: string[]
  treatmentTier: 'basic' | 'deep' | null
  styleId: string | null
  addons: string[]
  onServicesChange: (ids: string[]) => void
  onTreatmentTierChange: (tier: 'basic' | 'deep' | null) => void
  onStyleChange: (id: string | null) => void
  onAddonsChange: (addons: string[]) => void
}

const TREATMENT_TIERS = [
  { value: 'basic' as const, label: '基本' },
  { value: 'deep' as const, label: '深層' },
]

// Identify categories by name_zh for conditional UI behavior
function getSelectedNames(categories: ServiceCategory[], ids: string[]): Set<string> {
  return new Set(
    categories.filter(c => ids.includes(c.id)).map(c => c.name_zh)
  )
}

export default function NailsServiceStep({
  categories,
  styleModifiers,
  selectedServices,
  treatmentTier,
  styleId,
  addons,
  onServicesChange,
  onTreatmentTierChange,
  onStyleChange,
  onAddonsChange,
}: Props) {
  const mainServices = categories.filter(c => !c.is_addon)
  const addonCategories = categories.filter(c => c.is_addon)

  function toggleService(id: string) {
    const cat = categories.find(c => c.id === id)
    if (selectedServices.includes(id)) {
      onServicesChange(selectedServices.filter(s => s !== id))
      if (cat?.name_zh === '保養') onTreatmentTierChange(null)
      if (cat?.name_zh === '凝膠') onStyleChange(null)
    } else {
      onServicesChange([...selectedServices, id])
    }
  }

  function toggleAddon(id: string) {
    if (addons.includes(id)) {
      onAddonsChange(addons.filter(a => a !== id))
    } else {
      onAddonsChange([...addons, id])
    }
  }

  const selectedNames = getSelectedNames(categories, selectedServices)
  const showTreatmentTier = selectedNames.has('保養')
  const showStyle = selectedNames.has('凝膠')
  const showAddons = selectedNames.has('凝膠') || selectedNames.has('修補')

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">你需要什麼服務？</h2>
        <p className="text-xs text-muted-foreground">可複選</p>

        <div className="flex flex-wrap gap-2">
          {mainServices.map(s => {
            const isActive = selectedServices.includes(s.id)
            return (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
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

      {/* Treatment tier — inline below 保養 */}
      {showTreatmentTier && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">保養類型</p>
          <div className="flex gap-2">
            {TREATMENT_TIERS.map(t => {
              const isActive = treatmentTier === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => onTreatmentTierChange(isActive ? null : t.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-foreground/30'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Style — from DB style modifiers */}
      {showStyle && styleModifiers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">款式偏好（選填）</p>
          <div className="flex flex-wrap gap-2">
            {styleModifiers.map(s => {
              const isActive = styleId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => onStyleChange(isActive ? null : s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
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
      )}

      {/* Add-ons — from DB addon categories */}
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
