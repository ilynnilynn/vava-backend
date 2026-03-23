'use client'

type Props = {
  selectedServices: string[]
  treatmentTier: 'basic' | 'deep' | null
  styleId: string | null
  addons: string[]
  onServicesChange: (ids: string[]) => void
  onTreatmentTierChange: (tier: 'basic' | 'deep' | null) => void
  onStyleChange: (id: string | null) => void
  onAddonsChange: (addons: string[]) => void
}

// Hard-coded service options per spec (these match service_categories in DB)
const NAIL_SERVICES = [
  { id: 'gel', label: '凝膠' },
  { id: 'removal', label: '卸甲' },
  { id: 'repair', label: '修補' },
  { id: 'care', label: '保養' },
]

const TREATMENT_TIERS = [
  { value: 'basic' as const, label: '基本' },
  { value: 'deep' as const, label: '深層' },
]

const NAIL_STYLES = [
  { id: 'solid', label: '單色' },
  { id: 'design', label: '設計款' },
  { id: 'cat-eye', label: '貓眼' },
  { id: 'french', label: '法式' },
  { id: 'gradient', label: '漸層' },
  { id: 'mirror', label: '鏡面' },
]

export default function NailsServiceStep({
  selectedServices,
  treatmentTier,
  styleId,
  addons,
  onServicesChange,
  onTreatmentTierChange,
  onStyleChange,
  onAddonsChange,
}: Props) {
  function toggleService(id: string) {
    if (selectedServices.includes(id)) {
      onServicesChange(selectedServices.filter(s => s !== id))
      // Clear conditional fields when parent service removed
      if (id === 'care') onTreatmentTierChange(null)
      if (id === 'gel') onStyleChange(null)
    } else {
      onServicesChange([...selectedServices, id])
    }
  }

  const showTreatmentTier = selectedServices.includes('care')
  const showStyle = selectedServices.includes('gel')
  const showAddons = selectedServices.includes('gel') || selectedServices.includes('repair')

  function toggleAddon(addon: string) {
    if (addons.includes(addon)) {
      onAddonsChange(addons.filter(a => a !== addon))
    } else {
      onAddonsChange([...addons, addon])
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">你需要什麼服務？</h2>
        <p className="text-xs text-muted-foreground">可複選</p>

        <div className="flex flex-wrap gap-2">
          {NAIL_SERVICES.map(s => {
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
                {s.label}
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

      {/* Style — optional dropdown below 凝膠 */}
      {showStyle && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">款式偏好（選填）</p>
          <div className="flex flex-wrap gap-2">
            {NAIL_STYLES.map(s => {
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
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Add-ons — only when 凝膠 or 修補 selected */}
      {showAddons && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">加購項目（選填）</p>
          <button
            onClick={() => toggleAddon('extension')}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              addons.includes('extension')
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            延甲
          </button>
        </div>
      )}
    </div>
  )
}
