'use client'

// ============================================================
// FilteringWizard — step-by-step booking criteria form
//
// Steps: Location → Date → Time Band → Service → Preferences → Submit
// On submit: navigates to /search with serialized form params.
// ============================================================

import { useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { ServiceDomain, ServiceCategory, ServiceStyleModifier, LashSpecialFiberTag } from '@/types/database'

import LocationStep from './steps/LocationStep'
import DateStep from './steps/DateStep'
import TimeBandStep from './steps/TimeBandStep'
import NailsServiceStep from './steps/NailsServiceStep'
import LashesServiceStep from './steps/LashesServiceStep'
import PreferencesStep from './steps/PreferencesStep'

// ── Form state ────────────────────────────────────────────────

export type TimeBand = 'morning' | 'afternoon' | 'evening' | 'any'
export type DateOption = 'now' | string // 'now' or ISO date string

export type WizardState = {
  step: number
  domain: ServiceDomain
  // Location
  lat: number | null
  lng: number | null
  locationLabel: string
  // Date + time
  dates: DateOption[]
  timeBand: TimeBand | null
  // Nails
  nailServices: string[]        // category ids
  treatmentTier: 'basic' | 'deep' | null
  nailStyleId: string | null
  nailAddons: string[]           // 'extension' etc.
  // Lashes
  lashService: string | null     // category id
  lashRemovalAdded: boolean      // 卸睫 multi-selectable
  fillInDays: number | null
  lashDirectionId: string | null
  lashDensity: string | null
  lashStyleTags: string[]
  lashFiberTagId: string | null
  lashAddons: string[]
  // Shared tail
  silentPreference: boolean
  customerNote: string
  refPhotoUrl: string | null
}

type Action =
  | { type: 'SET_LOCATION'; lat: number; lng: number; label: string }
  | { type: 'TOGGLE_DATE'; date: DateOption }
  | { type: 'SET_TIME_BAND'; timeBand: TimeBand }
  | { type: 'SET_NAIL_SERVICES'; ids: string[] }
  | { type: 'SET_TREATMENT_TIER'; tier: 'basic' | 'deep' | null }
  | { type: 'SET_NAIL_STYLE'; styleId: string | null }
  | { type: 'SET_NAIL_ADDONS'; addons: string[] }
  | { type: 'SET_LASH_SERVICE'; id: string | null }
  | { type: 'SET_LASH_REMOVAL_ADDED'; added: boolean }
  | { type: 'SET_FILL_IN_DAYS'; days: number | null }
  | { type: 'SET_LASH_DIRECTION'; id: string | null }
  | { type: 'SET_LASH_DENSITY'; density: string | null }
  | { type: 'SET_LASH_STYLE_TAGS'; tags: string[] }
  | { type: 'SET_LASH_FIBER_TAG'; id: string | null }
  | { type: 'SET_LASH_ADDONS'; addons: string[] }
  | { type: 'SET_SILENT_PREFERENCE'; on: boolean }
  | { type: 'SET_CUSTOMER_NOTE'; note: string }
  | { type: 'SET_REF_PHOTO'; url: string | null }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, lat: action.lat, lng: action.lng, locationLabel: action.label }
    case 'TOGGLE_DATE': {
      const exists = state.dates.includes(action.date)
      const next = exists
        ? state.dates.filter(d => d !== action.date)
        : [...state.dates, action.date]
      // Clear timeBand if only 'now' remains
      const timeBand = next.every(d => d === 'now') ? null : state.timeBand
      return { ...state, dates: next, timeBand }
    }
    case 'SET_TIME_BAND':
      return { ...state, timeBand: action.timeBand }
    case 'SET_NAIL_SERVICES':
      return { ...state, nailServices: action.ids }
    case 'SET_TREATMENT_TIER':
      return { ...state, treatmentTier: action.tier }
    case 'SET_NAIL_STYLE':
      return { ...state, nailStyleId: action.styleId }
    case 'SET_NAIL_ADDONS':
      return { ...state, nailAddons: action.addons }
    case 'SET_LASH_SERVICE':
      return { ...state, lashService: action.id }
    case 'SET_LASH_REMOVAL_ADDED':
      return { ...state, lashRemovalAdded: action.added }
    case 'SET_FILL_IN_DAYS':
      return { ...state, fillInDays: action.days }
    case 'SET_LASH_DIRECTION':
      return { ...state, lashDirectionId: action.id }
    case 'SET_LASH_DENSITY':
      return { ...state, lashDensity: action.density }
    case 'SET_LASH_STYLE_TAGS':
      return { ...state, lashStyleTags: action.tags }
    case 'SET_LASH_FIBER_TAG':
      return { ...state, lashFiberTagId: action.id }
    case 'SET_LASH_ADDONS':
      return { ...state, lashAddons: action.addons }
    case 'SET_SILENT_PREFERENCE':
      return { ...state, silentPreference: action.on }
    case 'SET_CUSTOMER_NOTE':
      return { ...state, customerNote: action.note }
    case 'SET_REF_PHOTO':
      return { ...state, refPhotoUrl: action.url }
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }
    case 'PREV_STEP':
      return { ...state, step: Math.max(0, state.step - 1) }
    default:
      return state
  }
}

type InitArg = { domain: ServiceDomain; overrides?: Partial<WizardState> }

function initialState({ domain, overrides }: InitArg): WizardState {
  return {
    step: 0,
    domain,
    lat: overrides?.lat ?? null,
    lng: overrides?.lng ?? null,
    locationLabel: overrides?.locationLabel ?? '',
    dates: overrides?.dates ?? [],
    timeBand: overrides?.timeBand ?? null,
    nailServices: overrides?.nailServices ?? [],
    treatmentTier: overrides?.treatmentTier ?? null,
    nailStyleId: overrides?.nailStyleId ?? null,
    nailAddons: overrides?.nailAddons ?? [],
    lashService: overrides?.lashService ?? null,
    lashRemovalAdded: overrides?.lashRemovalAdded ?? false,
    fillInDays: overrides?.fillInDays ?? null,
    lashDirectionId: overrides?.lashDirectionId ?? null,
    lashDensity: overrides?.lashDensity ?? null,
    lashStyleTags: overrides?.lashStyleTags ?? [],
    lashFiberTagId: overrides?.lashFiberTagId ?? null,
    lashAddons: overrides?.lashAddons ?? [],
    silentPreference: overrides?.silentPreference ?? false,
    customerNote: overrides?.customerNote ?? '',
    refPhotoUrl: overrides?.refPhotoUrl ?? null,
  }
}

// ── Step definitions ──────────────────────────────────────────

function getSteps(): string[] {
  return ['location', 'date', 'service', 'preferences']
}

// ── Component ─────────────────────────────────────────────────

type FilteringWizardProps = {
  domain: ServiceDomain
  categories: ServiceCategory[]
  styleModifiers: ServiceStyleModifier[]
  fiberTags: LashSpecialFiberTag[]
  initialValues?: Partial<WizardState>
}

export default function FilteringWizard({ domain, categories, styleModifiers, fiberTags, initialValues }: FilteringWizardProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(
    reducer,
    { domain, overrides: initialValues },
    initialState,
  )

  const steps = getSteps()
  const currentStepName = steps[state.step] ?? 'preferences'
  const isLastStep = state.step >= steps.length - 1

  let canProceed = false
  switch (currentStepName) {
    case 'location':
      canProceed = state.lat !== null && state.lng !== null
      break
    case 'date':
      canProceed = state.dates.length > 0
        && (state.dates.every(d => d === 'now') || state.timeBand !== null)
      break
    case 'service':
      canProceed = domain === 'nails' ? state.nailServices.length > 0 : state.lashService !== null
      break
    case 'preferences':
      canProceed = true
      break
  }

  function handleNext() {
    if (isLastStep) {
      handleSubmit()
    } else {
      dispatch({ type: 'NEXT_STEP' })
    }
  }

  function handleSubmit() {
    const params = new URLSearchParams()
    params.set('domain', domain)

    if (state.lat !== null) params.set('lat', String(state.lat))
    if (state.lng !== null) params.set('lng', String(state.lng))
    if (state.locationLabel) params.set('locationLabel', state.locationLabel)
    if (state.dates.length) params.set('dates', state.dates.join(','))
    if (state.timeBand) params.set('timeBand', state.timeBand)

    if (domain === 'nails') {
      if (state.nailServices.length) params.set('services', state.nailServices.join(','))
      if (state.treatmentTier) params.set('treatmentTier', state.treatmentTier)
      if (state.nailStyleId) params.set('styleId', state.nailStyleId)
      if (state.nailAddons.length) params.set('addons', state.nailAddons.join(','))
    } else {
      if (state.lashService) params.set('services', state.lashService)
      if (state.lashRemovalAdded) params.set('lashRemoval', '1')
      if (state.fillInDays !== null) params.set('fillInDays', String(state.fillInDays))
      if (state.lashDirectionId) params.set('directionId', state.lashDirectionId)
      if (state.lashDensity) params.set('density', state.lashDensity)
      if (state.lashStyleTags.length) params.set('styleTags', state.lashStyleTags.join(','))
      if (state.lashFiberTagId) params.set('fiberTagId', state.lashFiberTagId)
      if (state.lashAddons.length) params.set('addons', state.lashAddons.join(','))
    }

    if (state.silentPreference) params.set('silent', '1')
    if (state.customerNote) params.set('note', state.customerNote)
    if (state.refPhotoUrl) params.set('refPhoto', state.refPhotoUrl)

    router.push(`/search?${params.toString()}`)
  }

  const title = domain === 'nails' ? '美甲預約' : '美睫預約'

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        {state.step > 0 ? (
          <button
            onClick={() => dispatch({ type: 'PREV_STEP' })}
            className="text-xs text-muted-foreground"
          >
            ← 上一步
          </button>
        ) : (
          <button
            onClick={() => router.push('/home')}
            className="text-xs text-muted-foreground"
          >
            ← 返回
          </button>
        )}
        <h1 className="mt-2 text-xl font-bold text-foreground">{title}</h1>
        {/* Progress */}
        <div className="mt-3 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= state.step ? 'bg-foreground' : 'bg-secondary'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Step content */}
      <div className="px-5 pb-32">
        {currentStepName === 'location' && (
          <LocationStep
            lat={state.lat}
            lng={state.lng}
            label={state.locationLabel}
            onSet={(lat, lng, label) => dispatch({ type: 'SET_LOCATION', lat, lng, label })}
          />
        )}
        {currentStepName === 'date' && (
          <div className="space-y-6">
            <DateStep
              selected={state.dates}
              onToggle={(d) => dispatch({ type: 'TOGGLE_DATE', date: d })}
            />
            {state.dates.some(d => d !== 'now') && (
              <TimeBandStep
                selected={state.timeBand}
                onSelect={(tb) => dispatch({ type: 'SET_TIME_BAND', timeBand: tb })}
              />
            )}
          </div>
        )}
        {currentStepName === 'service' && domain === 'nails' && (
          <NailsServiceStep
            categories={categories}
            styleModifiers={styleModifiers}
            selectedServices={state.nailServices}
            treatmentTier={state.treatmentTier}
            styleId={state.nailStyleId}
            addons={state.nailAddons}
            onServicesChange={(ids) => dispatch({ type: 'SET_NAIL_SERVICES', ids })}
            onTreatmentTierChange={(t) => dispatch({ type: 'SET_TREATMENT_TIER', tier: t })}
            onStyleChange={(id) => dispatch({ type: 'SET_NAIL_STYLE', styleId: id })}
            onAddonsChange={(a) => dispatch({ type: 'SET_NAIL_ADDONS', addons: a })}
          />
        )}
        {currentStepName === 'service' && domain === 'lashes' && (
          <LashesServiceStep
            categories={categories}
            fiberTags={fiberTags}
            selectedService={state.lashService}
            removalAdded={state.lashRemovalAdded}
            fillInDays={state.fillInDays}
            directionId={state.lashDirectionId}
            density={state.lashDensity}
            styleTags={state.lashStyleTags}
            fiberTagId={state.lashFiberTagId}
            addons={state.lashAddons}
            onServiceChange={(id) => dispatch({ type: 'SET_LASH_SERVICE', id })}
            onRemovalToggle={(on) => dispatch({ type: 'SET_LASH_REMOVAL_ADDED', added: on })}
            onFillInDaysChange={(d) => dispatch({ type: 'SET_FILL_IN_DAYS', days: d })}
            onDirectionChange={(id) => dispatch({ type: 'SET_LASH_DIRECTION', id })}
            onDensityChange={(d) => dispatch({ type: 'SET_LASH_DENSITY', density: d })}
            onStyleTagsChange={(t) => dispatch({ type: 'SET_LASH_STYLE_TAGS', tags: t })}
            onFiberTagChange={(id) => dispatch({ type: 'SET_LASH_FIBER_TAG', id })}
            onAddonsChange={(a) => dispatch({ type: 'SET_LASH_ADDONS', addons: a })}
          />
        )}
        {currentStepName === 'preferences' && (
          <PreferencesStep
            silentPreference={state.silentPreference}
            customerNote={state.customerNote}
            refPhotoUrl={state.refPhotoUrl}
            onSilentChange={(on) => dispatch({ type: 'SET_SILENT_PREFERENCE', on })}
            onNoteChange={(note) => dispatch({ type: 'SET_CUSTOMER_NOTE', note })}
            onRefPhotoChange={(url) => dispatch({ type: 'SET_REF_PHOTO', url })}
          />
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-5">
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          {isLastStep ? '搜尋設計師' : '下一步'}
        </Button>
      </div>
    </main>
  )
}
