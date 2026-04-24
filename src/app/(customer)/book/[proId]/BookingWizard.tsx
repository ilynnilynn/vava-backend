'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import PortfolioGallery from './PortfolioGallery'
import type {
  Slot,
  ProService,
  ServiceCategory,
  ServiceStyleModifier,
  ServiceDomain,
  NailScope,
  LashDensity,
} from '@/types/database'

// ── Props ────────────────────────────────────────────────────

type ProInfo = {
  id: string
  displayName: string
  studioAddress: string
  profilePhotoUrl: string | null
  noShowWindowMinutes: number
  portfolioPhotos: string[]
  averageRating: number | null
  ratingCount: number
}

type BookingWizardProps = {
  pro: ProInfo
  domain: ServiceDomain
  slots: Slot[]
  proServices: ProService[]
  categories: ServiceCategory[]
  styleModifiers: ServiceStyleModifier[]
}

// ── Wizard state ─────────────────────────────────────────────

type WizardState = {
  step: number
  slotId: string | null
  startsAt: string | null
  categoryIds: string[]
  styleId: string | null
  nailScope: NailScope | null
  lashDensity: LashDensity | null
  addonIds: string[]
  preference: string[]
  customerNote: string
  briefingRefPhotoUrl: string | null
}

const INITIAL_STATE: WizardState = {
  step: 0,
  slotId: null,
  startsAt: null,
  categoryIds: [],
  styleId: null,
  nailScope: null,
  lashDensity: null,
  addonIds: [],
  preference: [],
  customerNote: '',
  briefingRefPhotoUrl: null,
}

// ── Step definitions by domain ───────────────────────────────

type StepKey =
  | 'slot'
  | 'category'
  | 'style'
  | 'scope'
  | 'density'
  | 'addons'
  | 'preferences'
  | 'confirm'

function getSteps(domain: ServiceDomain, hasStyles: boolean): StepKey[] {
  if (domain === 'nails') {
    const steps: StepKey[] = ['slot', 'category']
    if (hasStyles) steps.push('style')
    steps.push('scope', 'addons', 'preferences', 'confirm')
    return steps
  }
  // lashes
  const steps: StepKey[] = ['slot', 'category']
  if (hasStyles) steps.push('style')
  steps.push('density', 'addons', 'preferences', 'confirm')
  return steps
}

// ── Component ────────────────────────────────────────────────

export default function BookingWizard({
  pro,
  domain,
  slots,
  proServices,
  categories,
  styleModifiers,
}: BookingWizardProps) {
  const router = useRouter()
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [availableSlots, setAvailableSlots] = useState<Slot[]>(slots)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)

  // Filter categories/styles to this domain & pro
  const proCategoryIds = new Set(proServices.map(ps => ps.category_id))
  const domainCategories = categories.filter(
    c => c.domain === domain && proCategoryIds.has(c.id) && !c.is_addon
  )
  const addonCategories = categories.filter(
    c => c.domain === domain && proCategoryIds.has(c.id) && c.is_addon
  )

  // Check if any selected category has styles
  const selectedCategories = categories.filter(c => state.categoryIds.includes(c.id))
  const hasStyles = selectedCategories.some(c => c.has_styles)

  const steps = getSteps(domain, hasStyles)
  const currentStep = steps[state.step]

  // Style modifiers filtered to domain
  const domainStyles = styleModifiers.filter(s => s.service_type === domain)

  function update(partial: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...partial }))
  }

  function next() {
    setState(prev => ({ ...prev, step: prev.step + 1 }))
  }

  function back() {
    setState(prev => ({ ...prev, step: Math.max(0, prev.step - 1) }))
  }

  // ── Photo upload ─────────────────────────────────────────

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('reference-photos')
        .upload(path, file, { contentType: file.type })
      if (uploadError) {
        setError('照片上傳失敗，請稍後再試')
        return
      }
      const { data: urlData } = supabase.storage
        .from('reference-photos')
        .getPublicUrl(path)
      update({ briefingRefPhotoUrl: urlData.publicUrl })
    } catch {
      setError('照片上傳失敗，請稍後再試')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // ── Price calculation ──────────────────────────────────────

  function calculatePrice(): { min: number; max: number; duration: number } {
    let total = 0
    let duration = 0

    // Main service categories
    for (const catId of state.categoryIds) {
      const matching = proServices.filter(ps => ps.category_id === catId)
      if (state.styleId) {
        const withStyle = matching.find(ps => ps.style_id === state.styleId)
        if (withStyle) {
          total += withStyle.price_ntd
          duration += withStyle.duration_minutes
          // Add density delta for lashes
          if (domain === 'lashes' && state.lashDensity) {
            total += getDensityDelta(withStyle, state.lashDensity)
          }
          continue
        }
      }
      // No style or style not found — use the first matching (no style)
      const base = matching.find(ps => !ps.style_id) ?? matching[0]
      if (base) {
        total += base.price_ntd
        duration += base.duration_minutes
        if (domain === 'lashes' && state.lashDensity) {
          total += getDensityDelta(base, state.lashDensity)
        }
      }
    }

    // Addons
    for (const addonId of state.addonIds) {
      const addon = proServices.find(
        ps => ps.category_id === addonId && ps.is_enabled
      )
      if (addon) {
        total += addon.addon_price_ntd ?? addon.price_ntd
        duration += addon.duration_minutes
      }
    }

    // Nails scope multiplier for "both" (hands + feet)
    if (domain === 'nails' && state.nailScope === 'both') {
      // Both hands and feet = roughly 1.5x duration (price stays same — it's per-scope already)
      duration = Math.ceil(duration * 1.5)
    }

    return { min: total, max: total, duration }
  }

  // ── Submit ─────────────────────────────────────────────────

  async function handleConfirm() {
    if (submitting) return
    setError(null)
    setSubmitting(true)

    const { min, max, duration } = calculatePrice()

    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proId: pro.id,
          slotId: state.slotId,
          startsAt: state.startsAt,
          durationMinutes: duration,
          noShowWindowMinutes: pro.noShowWindowMinutes,
          priceMin: min,
          priceMax: max,
          serviceCategoryIds: state.categoryIds,
          styleId: state.styleId,
          lashDensity: state.lashDensity,
          addonIds: state.addonIds.length > 0 ? state.addonIds : null,
          nailScope: state.nailScope,
          preference: state.preference.length > 0 ? state.preference : null,
          customerNote: state.customerNote.trim() || null,
          briefingRefPhotoUrl: state.briefingRefPhotoUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          // Slot taken — reset to slot picker and refresh available slots
          setError('此時段剛被預約，請重新選擇')
          setState({ ...INITIAL_STATE })
          try {
            const supabase = createClient()
            const { data: freshSlots } = await supabase
              .from('slots')
              .select('*')
              .eq('pro_id', pro.id)
              .eq('is_booked', false)
              .eq('is_expired', false)
              .gte('starts_at', new Date().toISOString())
              .order('starts_at', { ascending: true })
            if (freshSlots) setAvailableSlots(freshSlots)
          } catch {
            // best-effort refresh
          }
          setSubmitting(false)
          return
        }
        setError(data.error ?? '預約失敗，請稍後再試')
        setSubmitting(false)
        return
      }

      router.push(`/bookings/${data.booking.id}`)
    } catch {
      setError('網路錯誤，請稍後再試')
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="pb-12">
      {/* Portfolio gallery lightbox */}
      {galleryIndex !== null && pro.portfolioPhotos.length > 0 && (
        <PortfolioGallery
          photos={pro.portfolioPhotos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}

      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="text-xs text-muted-foreground">
          ← 返回
        </button>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
            {pro.profilePhotoUrl ? (
              <img src={pro.profilePhotoUrl} alt={pro.displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {pro.displayName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-foreground">{pro.displayName}</p>
              {pro.averageRating !== null && (
                <span className="text-xs text-muted-foreground">
                  <span className="text-star">★</span> {pro.averageRating} ({pro.ratingCount})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{pro.studioAddress}</p>
          </div>
        </div>
        {pro.portfolioPhotos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {pro.portfolioPhotos.map((url, i) => (
              <button
                key={i}
                onClick={() => setGalleryIndex(i)}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary"
              >
                <img src={url} alt={`${pro.displayName} 作品 ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Progress */}
      <div className="px-5 mb-6">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= state.step ? 'bg-foreground' : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="px-5">
        {currentStep === 'slot' && (
          <SlotPicker
            slots={availableSlots}
            selectedId={state.slotId}
            onSelect={(slotId, startsAt) => {
              update({ slotId, startsAt })
            }}
          />
        )}

        {currentStep === 'category' && (
          <CategoryPicker
            categories={domainCategories}
            selectedIds={state.categoryIds}
            multiSelect={domain === 'nails'}
            onSelect={(ids) => update({ categoryIds: ids })}
          />
        )}

        {currentStep === 'style' && (
          <StylePicker
            styles={domainStyles}
            selectedId={state.styleId}
            onSelect={(id) => update({ styleId: id })}
          />
        )}

        {currentStep === 'scope' && (
          <ScopePicker
            selected={state.nailScope}
            onSelect={(scope) => update({ nailScope: scope })}
          />
        )}

        {currentStep === 'density' && (
          <DensityPicker
            selected={state.lashDensity}
            onSelect={(density) => update({ lashDensity: density })}
          />
        )}

        {currentStep === 'addons' && (
          <AddonPicker
            addons={addonCategories}
            selectedIds={state.addonIds}
            onSelect={(ids) => update({ addonIds: ids })}
          />
        )}

        {currentStep === 'preferences' && (
          <PreferencesStep
            preference={state.preference}
            customerNote={state.customerNote}
            onPreferenceChange={(pref) => update({ preference: pref })}
            onNoteChange={(note) => update({ customerNote: note })}
            refPhotoUrl={state.briefingRefPhotoUrl}
            uploadingPhoto={uploadingPhoto}
            onPhotoSelect={(file) => handlePhotoUpload(file)}
            onPhotoRemove={() => update({ briefingRefPhotoUrl: null })}
          />
        )}

        {currentStep === 'confirm' && (
          <ConfirmStep
            pro={pro}
            state={state}
            categories={categories}
            styleModifiers={styleModifiers}
            price={calculatePrice()}
            domain={domain}
          />
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {state.step > 0 && (
            <Button
              variant="outline"
              onClick={back}
              className="h-12 flex-1 rounded-2xl"
            >
              上一步
            </Button>
          )}

          {currentStep === 'confirm' ? (
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="h-12 flex-1 rounded-2xl text-base font-semibold"
            >
              {submitting ? '預約中...' : '確認預約'}
            </Button>
          ) : currentStep === 'addons' || currentStep === 'preferences' ? (
            // Optional steps — allow skip
            <Button
              onClick={next}
              className="h-12 flex-1 rounded-2xl text-base font-semibold"
            >
              {(currentStep === 'addons' && state.addonIds.length === 0) ||
               (currentStep === 'preferences' && state.preference.length === 0 && !state.customerNote.trim())
                ? '跳過'
                : '下一步'}
            </Button>
          ) : (
            <Button
              onClick={next}
              disabled={!canProceed(currentStep, state)}
              className="h-12 flex-1 rounded-2xl text-base font-semibold"
            >
              下一步
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Validation ───────────────────────────────────────────────

function canProceed(step: StepKey, state: WizardState): boolean {
  switch (step) {
    case 'slot':
      return !!state.slotId
    case 'category':
      return state.categoryIds.length > 0
    case 'style':
      return !!state.styleId
    case 'scope':
      return !!state.nailScope
    case 'density':
      return !!state.lashDensity
    default:
      return true
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getDensityDelta(ps: ProService, density: LashDensity): number {
  if (density === 'light') return ps.density_light_delta ?? 0
  if (density === 'daily') return ps.density_daily_delta ?? 0
  if (density === 'heavy') return ps.density_heavy_delta ?? 0
  return 0
}

function formatSlotTime(startsAt: string): string {
  const date = new Date(startsAt)
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupSlotsByDate(slotsToGroup: Slot[]): Map<string, Slot[]> {
  const grouped = new Map<string, Slot[]>()
  for (const slot of slotsToGroup) {
    const dateKey = new Date(slot.starts_at).toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
    const existing = grouped.get(dateKey) ?? []
    existing.push(slot)
    grouped.set(dateKey, existing)
  }
  return grouped
}

// ── Step components ──────────────────────────────────────────

function SlotPicker({
  slots,
  selectedId,
  onSelect,
}: {
  slots: Slot[]
  selectedId: string | null
  onSelect: (slotId: string, startsAt: string) => void
}) {
  const grouped = groupSlotsByDate(slots)

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl bg-secondary px-5 py-8 text-center">
        <p className="text-sm font-medium text-foreground">目前沒有可預約的時段</p>
        <p className="mt-1 text-xs text-muted-foreground">請稍後再查看</p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">選擇時段</h2>
      {Array.from(grouped.entries()).map(([dateLabel, dateSlots]) => (
        <div key={dateLabel} className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{dateLabel}</p>
          <div className="flex flex-wrap gap-2">
            {dateSlots.map(slot => (
              <button
                key={slot.id}
                onClick={() => onSelect(slot.id, slot.starts_at)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedId === slot.id
                    ? 'border-foreground bg-foreground text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-foreground/30'
                }`}
              >
                {formatSlotTime(slot.starts_at)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function CategoryPicker({
  categories,
  selectedIds,
  multiSelect,
  onSelect,
}: {
  categories: ServiceCategory[]
  selectedIds: string[]
  multiSelect: boolean
  onSelect: (ids: string[]) => void
}) {
  function toggle(id: string) {
    if (multiSelect) {
      onSelect(
        selectedIds.includes(id)
          ? selectedIds.filter(x => x !== id)
          : [...selectedIds, id]
      )
    } else {
      onSelect([id])
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">選擇服務</h2>
        {multiSelect && (
          <p className="text-xs text-muted-foreground mt-1">可多選</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggle(cat.id)}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              selectedIds.includes(cat.id)
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            <span className="block text-sm font-semibold">{cat.name_zh}</span>
            <span className={`block text-xs mt-0.5 ${
              selectedIds.includes(cat.id) ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {cat.name_en}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function StylePicker({
  styles,
  selectedId,
  onSelect,
}: {
  styles: ServiceStyleModifier[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">選擇風格</h2>
      <div className="grid grid-cols-2 gap-3">
        {styles.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              selectedId === s.id
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            <span className="block text-sm font-semibold">{s.name_zh}</span>
            <span className={`block text-xs mt-0.5 ${
              selectedId === s.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {s.name_en}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ScopePicker({
  selected,
  onSelect,
}: {
  selected: NailScope | null
  onSelect: (scope: NailScope) => void
}) {
  const options: { value: NailScope; label: string; desc: string }[] = [
    { value: 'hands', label: '手部', desc: '手指甲' },
    { value: 'feet', label: '足部', desc: '腳趾甲' },
    { value: 'both', label: '手＋足', desc: '手指甲 + 腳趾甲' },
  ]

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">服務部位</h2>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              selected === opt.value
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
            <span className={`block text-xs mt-0.5 ${
              selected === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function DensityPicker({
  selected,
  onSelect,
}: {
  selected: LashDensity | null
  onSelect: (density: LashDensity) => void
}) {
  const options: { value: LashDensity; label: string; desc: string }[] = [
    { value: 'light', label: '自然輕盈', desc: '100-150根' },
    { value: 'daily', label: '日常妝感', desc: '150-300根' },
    { value: 'heavy', label: '極致濃密', desc: '300-500+根' },
  ]

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">睫毛濃密度</h2>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              selected === opt.value
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            <span className="block text-sm font-semibold">{opt.label}</span>
            <span className={`block text-xs mt-0.5 ${
              selected === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function AddonPicker({
  addons,
  selectedIds,
  onSelect,
}: {
  addons: ServiceCategory[]
  selectedIds: string[]
  onSelect: (ids: string[]) => void
}) {
  function toggle(id: string) {
    onSelect(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    )
  }

  if (addons.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">加購項目</h2>
        <p className="text-xs text-muted-foreground mt-1">可選，可多選</p>
      </div>
      <div className="space-y-2">
        {addons.map(addon => (
          <button
            key={addon.id}
            onClick={() => toggle(addon.id)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              selectedIds.includes(addon.id)
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            <span className="block text-sm font-semibold">{addon.name_zh}</span>
            <span className={`block text-xs mt-0.5 ${
              selectedIds.includes(addon.id) ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              {addon.name_en}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

const PREFERENCE_OPTIONS = [
  { value: 'no_conversation', label: '不需要聊天' },
  { value: 'quiet_environment', label: '希望安靜環境' },
  { value: 'music_ok', label: '可以放音樂' },
]

function PreferencesStep({
  preference,
  customerNote,
  onPreferenceChange,
  onNoteChange,
  refPhotoUrl,
  uploadingPhoto,
  onPhotoSelect,
  onPhotoRemove,
}: {
  preference: string[]
  customerNote: string
  onPreferenceChange: (pref: string[]) => void
  onNoteChange: (note: string) => void
  refPhotoUrl: string | null
  uploadingPhoto: boolean
  onPhotoSelect: (file: File) => void
  onPhotoRemove: () => void
}) {
  function toggle(value: string) {
    onPreferenceChange(
      preference.includes(value)
        ? preference.filter(x => x !== value)
        : [...preference, value]
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">偏好設定</h2>
        <p className="text-xs text-muted-foreground mt-1">可選</p>
      </div>

      <div className="space-y-2">
        {PREFERENCE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              preference.includes(opt.value)
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Reference photo upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">參考照片</label>
        <p className="text-xs text-muted-foreground">上傳想要的風格參考圖</p>
        {refPhotoUrl ? (
          <div className="relative inline-block">
            <img
              src={refPhotoUrl}
              alt="參考照片"
              className="h-32 w-32 rounded-xl object-cover border border-border"
            />
            <button
              type="button"
              onClick={onPhotoRemove}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-primary-foreground text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card text-muted-foreground hover:border-foreground/30 transition-colors">
            {uploadingPhoto ? (
              <span className="text-xs">上傳中...</span>
            ) : (
              <span className="text-2xl">+</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingPhoto}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPhotoSelect(file)
              }}
            />
          </label>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">備註</label>
        <textarea
          value={customerNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="有什麼想告訴設計師的嗎？"
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none resize-none"
        />
      </div>
    </section>
  )
}

function ConfirmStep({
  pro,
  state,
  categories,
  styleModifiers,
  price,
  domain,
}: {
  pro: ProInfo
  state: WizardState
  categories: ServiceCategory[]
  styleModifiers: ServiceStyleModifier[]
  price: { min: number; max: number; duration: number }
  domain: ServiceDomain
}) {
  const selectedCats = categories.filter(c => state.categoryIds.includes(c.id))
  const selectedStyle = styleModifiers.find(s => s.id === state.styleId)
  const selectedAddons = categories.filter(c => state.addonIds.includes(c.id))

  const dateTime = state.startsAt
    ? new Date(state.startsAt).toLocaleString('zh-TW', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  const priceDisplay =
    price.min === price.max
      ? `NT$${price.min.toLocaleString()}`
      : `NT$${price.min.toLocaleString()} – ${price.max.toLocaleString()}`

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">確認預約</h2>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <Row label="設計師" value={pro.displayName} />
        <Row label="地址" value={pro.studioAddress} />
        <Row label="時間" value={dateTime} />
        <Row
          label="服務"
          value={selectedCats.map(c => c.name_zh).join(' + ')}
        />
        {selectedStyle && <Row label="風格" value={selectedStyle.name_zh} />}
        {domain === 'nails' && state.nailScope && (
          <Row
            label="部位"
            value={
              state.nailScope === 'hands' ? '手部' :
              state.nailScope === 'feet' ? '足部' : '手＋足'
            }
          />
        )}
        {domain === 'lashes' && state.lashDensity && (
          <Row
            label="濃密度"
            value={
              state.lashDensity === 'light' ? '自然輕盈' :
              state.lashDensity === 'daily' ? '日常妝感' : '極致濃密'
            }
          />
        )}
        {selectedAddons.length > 0 && (
          <Row label="加購" value={selectedAddons.map(a => a.name_zh).join(' + ')} />
        )}
        {state.preference.length > 0 && (
          <Row
            label="偏好"
            value={state.preference
              .map(p => PREFERENCE_OPTIONS.find(o => o.value === p)?.label ?? p)
              .join('、')}
          />
        )}
        {state.customerNote.trim() && (
          <Row label="備註" value={state.customerNote.trim()} />
        )}

        {state.briefingRefPhotoUrl && (
          <div className="flex justify-between items-start text-sm">
            <span className="text-muted-foreground">參考照片</span>
            <img
              src={state.briefingRefPhotoUrl}
              alt="參考照片"
              className="h-20 w-20 rounded-xl object-cover border border-border"
            />
          </div>
        )}

        <div className="border-t border-border pt-3 mt-3">
          <Row label="預估時間" value={`${price.duration} 分鐘`} />
          <Row label="預估費用" value={priceDisplay} bold />
        </div>
      </div>
    </section>
  )
}

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground ${bold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  )
}
