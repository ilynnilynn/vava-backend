'use client'

// ============================================================
// /pro/onboarding — 8-step pro registration wizard
//
// Step 1  LINE Login         (handled by auth flow — not here)
// Step 2  Basic Info         display_name, phone, gender, ig_handle
// Step 3  Studio Address     studio_address
// Step 4  Domain & Scope     nails / lashes / both + nail_scope
// Step 5  Services           per-category toggle (pricing set in dashboard)
// Step 6  Preferences        no_show_window_minutes
// Step 7  Portfolio & ID     min 3 photos + ID front photo
// Step 8  Review & Submit    summary → sets submitted_at
//
// On final submit → POST /api/pro/onboard → redirect /pro/pending
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'

// ── Types ────────────────────────────────────────────────────

type Step = 2 | 3 | 4 | 5 | 6 | 7 | 8
type Gender = 'male' | 'female' | 'other' | 'prefer_not'
type Domain = 'nails' | 'lashes' | 'both'
type NailScope = 'hands' | 'feet' | 'both'

interface ServiceRow {
  category_id: string
  name_zh: string
  domain: 'nails' | 'lashes'
  is_addon: boolean
  enabled: boolean
}

// ── Constants ────────────────────────────────────────────────

const PHONE_REGEX = /^09\d{8}$/
const TOTAL_STEPS = 7  // steps 2–8 displayed as progress 1–7

const STEP_LABELS: Record<Step, string> = {
  2: '基本資料',
  3: '工作室地址',
  4: '服務類型',
  5: '服務項目',
  6: '偏好設定',
  7: '作品集 & 證件',
  8: '確認提交',
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: '其他' },
  { value: 'prefer_not', label: '不便透露' },
]

const DOMAIN_OPTIONS: { value: Domain; label: string; desc: string }[] = [
  { value: 'nails', label: '美甲', desc: '凝膠 · 光療 · 手繪' },
  { value: 'lashes', label: '美睫', desc: '接睫 · 燙睫 · 霧眉' },
  { value: 'both', label: '兩者都做', desc: '美甲 + 美睫' },
]

const NAIL_SCOPE_OPTIONS: { value: NailScope; label: string }[] = [
  { value: 'hands', label: '手部' },
  { value: 'feet', label: '腳部' },
  { value: 'both', label: '手腳都做' },
]

const NO_SHOW_OPTIONS = [
  { value: 10, label: '10 分鐘', desc: '較嚴格' },
  { value: 15, label: '15 分鐘', desc: '預設' },
  { value: 20, label: '20 分鐘', desc: '較寬鬆' },
]

// ── Main Component ───────────────────────────────────────────

export default function ProOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  // ── Navigation state
  const [step, setStep] = useState<Step>(2)

  // ── Step 2: Basic Info
  const [displayName, setDisplayName] = useState('')
  const [studioName, setStudioName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [igHandle, setIgHandle] = useState('')

  // ── Step 3: Studio Address
  const [studioAddress, setStudioAddress] = useState('')

  // ── Step 4: Domain & Scope
  const [domain, setDomain] = useState<Domain | null>(null)
  const [nailScope, setNailScope] = useState<NailScope | null>(null)

  // ── Step 5: Services
  const [services, setServices] = useState<ServiceRow[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [serviceDomain, setServiceDomain] = useState<'nails' | 'lashes'>('nails')

  // ── Step 6: Preferences
  const [noShowWindow, setNoShowWindow] = useState<10 | 15 | 20>(15)

  // ── Step 7: Files
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')
  const [step7Sub, setStep7Sub] = useState<'portfolio' | 'id'>('portfolio')
  const portfolioInputRef = useRef<HTMLInputElement>(null)
  const idInputRef = useRef<HTMLInputElement>(null)

  // ── Submission
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch service categories when reaching step 5 ──────────
  useEffect(() => {
    if (step !== 5 || services.length > 0) return

    setServicesLoading(true)

    const relevantTypes: string[] =
      domain === 'both' ? ['nails', 'lashes']
        : domain === 'nails' ? ['nails']
          : ['lashes']

    supabase
      .from('service_categories')
      .select('id, name_zh, service_type, is_addon')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error: catError }) => {
        if (catError || !data) {
          setServicesError(catError?.message ?? 'Unknown error')
          setServicesLoading(false)
          return
        }

        const rows: ServiceRow[] = data
          .filter(c => relevantTypes.includes(c.service_type))
          .map(c => ({
            category_id: c.id,
            name_zh: c.name_zh,
            domain: c.service_type as 'nails' | 'lashes',
            is_addon: c.is_addon ?? false,
            enabled: false,
          }))

        setServices(rows)
        setServicesLoading(false)
      })
  }, [step])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation helpers ──────────────────────────────────────

  const phoneValid = PHONE_REGEX.test(phone)

  const step2Valid = (
    displayName.trim().length > 0 &&
    phoneValid &&
    gender !== ''
    // ig_handle is optional
  )

  const step3Valid = studioAddress.trim().length > 0

  const step4Valid = (
    domain !== null &&
    (domain === 'lashes' || nailScope !== null)
  )

  const step5Valid = services
    .filter(s => !s.is_addon)
    .some(s => s.enabled)

  // ── Navigation ──────────────────────────────────────────────

  function prev() {
    if (step === 5 && serviceDomain === 'lashes') {
      setServiceDomain('nails')
      return
    }
    if (step === 7 && step7Sub === 'id') {
      setStep7Sub('portfolio')
      return
    }
    if (step > 2) setStep((step - 1) as Step)
  }

  function next() {
    setError(null)
    if (step === 4) {
      // Entering step 5 — initialize serviceDomain
      setServiceDomain(domain === 'lashes' ? 'lashes' : 'nails')
      setStep(5)
      return
    }
    if (step === 5 && domain === 'both' && serviceDomain === 'nails') {
      setServiceDomain('lashes')
      return
    }
    if (step === 6) {
      // Entering step 7 — reset to portfolio sub-page
      setStep7Sub('portfolio')
      setStep(7)
      return
    }
    if (step === 7 && step7Sub === 'portfolio') {
      setStep7Sub('id')
      return
    }
    if (step < 8) setStep((step + 1) as Step)
  }

  // ── Service helpers ─────────────────────────────────────────

  function toggleService(id: string) {
    setServices(prev => prev.map(s =>
      s.category_id === id ? { ...s, enabled: !s.enabled } : s
    ))
  }

  // ── Portfolio file helpers ──────────────────────────────────

  function addPortfolioFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPortfolioFiles(prev => {
      const combined = [...prev, ...newFiles]
      return combined.slice(0, 9) // max 9
    })
  }

  function removePortfolioFile(idx: number) {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Final submit ─────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('登入已過期，請重新登入。'); return }

      // ── Upload portfolio photos ───────────────────────────
      setUploadProgress('上傳作品集中⋯')
      const portfolioUrls: string[] = []

      for (let i = 0; i < portfolioFiles.length; i++) {
        const file = portfolioFiles[i]
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${Date.now()}_${i}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('portfolio-photos')
          .upload(path, file, { upsert: true })

        if (upErr) throw new Error(`作品集上傳失敗：${upErr.message}`)

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio-photos')
          .getPublicUrl(path)

        portfolioUrls.push(publicUrl)
      }

      // ── Upload ID photo (via server to bypass storage RLS) ──
      setUploadProgress('上傳證件中⋯')
      let idPhotoPath: string | null = null

      if (idPhotoFile) {
        const idForm = new FormData()
        idForm.append('file', idPhotoFile)

        const idRes = await fetch('/api/pro/upload-id', {
          method: 'POST',
          body: idForm,
        })

        if (!idRes.ok) {
          const idBody = await idRes.json().catch(() => ({}))
          throw new Error(`證件上傳失敗：${idBody.error ?? 'Unknown error'}`)
        }

        const { path } = await idRes.json()
        idPhotoPath = path
      }

      setUploadProgress('提交資料中⋯')

      // ── POST to API ───────────────────────────────────────
      const res = await fetch('/api/pro/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          studio_name: studioName.trim() || null,
          phone,
          gender,
          ig_handle: igHandle.trim().replace(/^@/, '') || null,
          studio_address: studioAddress.trim(),
          domain,
          nail_scope: nailScope,
          services: services.filter(s => s.enabled).map(s => ({ category_id: s.category_id })),
          no_show_window_minutes: noShowWindow,
          portfolio_urls: portfolioUrls,
          id_photo_path: idPhotoPath,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? '提交失敗，請重試。')
        return
      }

      router.replace('/pro/pending')

    } catch (err) {
      setError(err instanceof Error ? err.message : '網路異常，請稍後再試。')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  // ── Progress indicator ──────────────────────────────────────

  const progressStep = step - 1  // step 2 = progress 1, step 8 = progress 7

  // ── Render ──────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background flex flex-col">

      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 pt-12 pb-6">
        {step > 2 && (
          <button
            onClick={prev}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 返回
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            設計師申請 {progressStep} / {TOTAL_STEPS}
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {step === 7 ? (step7Sub === 'portfolio' ? '作品集' : '證件上傳') : STEP_LABELS[step]}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border mx-5 rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-300"
          style={{ width: `${(progressStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 px-5 py-8">
        <div className="w-full max-w-sm mx-auto">

          {/* ── STEP 2: Basic Info ──────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-foreground">基本資料</h1>

              <div className="space-y-4">

                {/* Display name — what customers see */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    對外顯示名稱 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="客人看到的名字，例如：小美、Mei"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="h-12"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    顯示在預約頁面上的名稱
                  </p>
                </div>

                {/* Studio name — separate brand/shop name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    工作室名稱
                    <span className="ml-1 text-xs text-muted-foreground">（選填）</span>
                  </label>
                  <Input
                    placeholder="例如：Mei Nails Studio"
                    value={studioName}
                    onChange={e => setStudioName(e.target.value)}
                    maxLength={80}
                    className="h-12"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    手機號碼 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="09XXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value.trim())}
                    maxLength={10}
                    className="h-12"
                  />
                  {phone.length > 0 && !phoneValid && (
                    <p className="text-xs text-destructive">請輸入 09 開頭的 10 碼號碼</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    性別 <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDER_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGender(opt.value)}
                        className={[
                          'rounded-xl border py-3 text-sm font-medium transition-all',
                          gender === opt.value
                            ? 'border-foreground bg-foreground text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:border-foreground/30',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instagram */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Instagram
                    <span className="ml-1 text-xs text-muted-foreground">（選填）</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">@</span>
                    <Input
                      placeholder="your.handle"
                      value={igHandle}
                      onChange={e => setIgHandle(e.target.value.replace(/^@/, ''))}
                      className="h-12 pl-7"
                    />
                  </div>
                </div>

              </div>

              <Button
                onClick={next}
                disabled={!step2Valid}
                className="h-13 w-full rounded-2xl text-base font-semibold mt-2"
              >
                下一步
              </Button>
            </div>
          )}

          {/* ── STEP 3: Studio Address ───────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">工作室地址</h1>
                <p className="text-sm text-muted-foreground">
                  填寫客人到訪的實際地址
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  地址 <span className="text-destructive">*</span>
                </label>
                <AddressAutocomplete
                  placeholder="台北市大安區忠孝東路四段…"
                  value={studioAddress}
                  onChange={setStudioAddress}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  審核通過後，地址變更需重新審核
                </p>
              </div>

              <Button
                onClick={next}
                disabled={!step3Valid}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </div>
          )}

          {/* ── STEP 4: Domain & Scope ───────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">你提供什麼服務？</h1>
                <p className="text-sm text-muted-foreground">決定你的服務類型</p>
              </div>

              {/* Domain picker */}
              <div className="space-y-2">
                {DOMAIN_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setDomain(opt.value); setNailScope(null) }}
                    className={[
                      'w-full flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all',
                      domain === opt.value
                        ? 'border-foreground bg-foreground text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-foreground/30',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className={[
                      'text-xs',
                      domain === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    ].join(' ')}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* Nail scope — only shown when nails selected */}
              {(domain === 'nails' || domain === 'both') && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    美甲服務範圍 <span className="text-destructive">*</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {NAIL_SCOPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNailScope(opt.value)}
                        className={[
                          'rounded-xl border py-3 text-sm font-medium transition-all',
                          nailScope === opt.value
                            ? 'border-foreground bg-foreground text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:border-foreground/30',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={next}
                disabled={!step4Valid}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </div>
          )}

          {/* ── STEP 5: Services (toggle only) ─────────────────── */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {serviceDomain === 'nails' ? '美甲' : '美睫'} 服務項目
                </h1>
                <p className="text-sm text-muted-foreground">
                  選擇你提供的服務，價格和時間之後在後台設定
                </p>
              </div>

              {servicesLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  載入服務項目中⋯
                </div>
              ) : servicesError ? (
                <div className="rounded-2xl bg-destructive/10 px-5 py-6 text-sm text-destructive text-center">
                  載入失敗：{servicesError}
                </div>
              ) : services.length === 0 ? (
                <div className="rounded-2xl bg-secondary px-5 py-6 text-sm text-muted-foreground text-center">
                  找不到服務項目（domain: {domain}）
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select all toggle */}
                  {(() => {
                    const domainServices = services.filter(s => s.domain === serviceDomain)
                    const allEnabled = domainServices.length > 0 && domainServices.every(s => s.enabled)
                    return (
                      <div className="flex items-center justify-between px-1 pb-1">
                        <span className="text-sm font-medium text-muted-foreground">全選</span>
                        <Switch
                          checked={allEnabled}
                          onCheckedChange={(checked) => {
                            setServices(prev => prev.map(s =>
                              s.domain === serviceDomain ? { ...s, enabled: checked } : s
                            ))
                          }}
                          aria-label={allEnabled ? '取消全選' : '全選'}
                        />
                      </div>
                    )
                  })()}

                  {services.filter(s => s.domain === serviceDomain && !s.is_addon).map(svc => (
                    <div
                      key={svc.category_id}
                      className={[
                        'flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all',
                        svc.enabled ? 'border-foreground' : 'border-border bg-card',
                      ].join(' ')}
                    >
                      <span className="font-medium text-foreground">{svc.name_zh}</span>
                      <Switch
                        checked={svc.enabled}
                        onCheckedChange={() => toggleService(svc.category_id)}
                        aria-label={svc.enabled ? '關閉' : '開啟'}
                      />
                    </div>
                  ))}

                  {services.filter(s => s.domain === serviceDomain && s.is_addon).length > 0 && (
                    <>
                      <h2 className="text-sm font-semibold text-muted-foreground mt-4">加購項目</h2>
                      <p className="text-xs text-muted-foreground -mt-2">客人可在預約時加點</p>
                      {services.filter(s => s.domain === serviceDomain && s.is_addon).map(svc => (
                        <div
                          key={svc.category_id}
                          className={[
                            'flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all',
                            svc.enabled ? 'border-foreground' : 'border-border bg-card',
                          ].join(' ')}
                        >
                          <span className="font-medium text-foreground">{svc.name_zh}</span>
                          <Switch
                            checked={svc.enabled}
                            onCheckedChange={() => toggleService(svc.category_id)}
                            aria-label={svc.enabled ? '關閉' : '開啟'}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              <Button
                onClick={next}
                disabled={!step5Valid}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </div>
          )}

          {/* ── STEP 6: Preferences ──────────────────────────── */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">偏好設定</h1>
                <p className="text-sm text-muted-foreground">之後可以在後台修改</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">遲到容許時間</p>
                <p className="text-xs text-muted-foreground mb-3">
                  客人超過此時間未到，視為爽約
                </p>
                {NO_SHOW_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNoShowWindow(opt.value as 10 | 15 | 20)}
                    className={[
                      'w-full flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all',
                      noShowWindow === opt.value
                        ? 'border-foreground bg-foreground text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-foreground/30',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className={[
                      'text-xs',
                      noShowWindow === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    ].join(' ')}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>

              <Button
                onClick={next}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </div>
          )}

          {/* ── STEP 7: Portfolio ─────────────────────────────── */}
          {step === 7 && step7Sub === 'portfolio' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">作品集照片</h1>
                <p className="text-sm text-muted-foreground">
                  展示你的作品，讓客人看到你的風格
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-foreground">
                    作品集 <span className="text-destructive">*</span>
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {portfolioFiles.length} / 9（至少 3 張）
                  </span>
                </div>

                {/* Fixed 3×3 grid, 3:4 vertical aspect */}
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const file = portfolioFiles[idx]
                    return file ? (
                      <div key={idx} className="relative aspect-[3/4]">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`作品 ${idx + 1}`}
                          className="h-full w-full rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePortfolioFile(idx)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-primary-foreground text-xs shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => portfolioInputRef.current?.click()}
                        className={[
                          'aspect-[3/4] rounded-xl border-2 border-border flex items-center justify-center transition-colors',
                          idx === portfolioFiles.length
                            ? 'text-[#1F2723] hover:border-foreground/30'
                            : 'text-muted-foreground hover:border-foreground/30',
                        ].join(' ')}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    )
                  })}
                </div>

                <input
                  ref={portfolioInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { addPortfolioFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              <Button
                onClick={next}
                disabled={portfolioFiles.length < 3}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </div>
          )}

          {step === 7 && step7Sub === 'id' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">身分證件</h1>
                <p className="text-sm text-muted-foreground">
                  僅供 VAVA 內部審核，不會對客人顯示
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  身分證件（正面）<span className="text-destructive">*</span>
                </p>

                {idPhotoFile ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(idPhotoFile)}
                      alt="證件照"
                      className="w-full rounded-2xl object-cover max-h-40"
                    />
                    <button
                      type="button"
                      onClick={() => setIdPhotoFile(null)}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-primary-foreground text-xs shadow"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => idInputRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed border-border py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-foreground/30 transition-colors"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="text-sm">拍照或上傳</span>
                  </button>
                )}

                <input
                  ref={idInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => setIdPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <Button
                onClick={next}
                disabled={!idPhotoFile}
                className="h-13 w-full rounded-2xl text-base font-semibold"
              >
                下一步
              </Button>
            </div>
          )}

          {/* ── STEP 8: Review & Submit ──────────────────────── */}
          {step === 8 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">確認並提交</h1>
                <p className="text-sm text-muted-foreground">
                  提交後資料將鎖定，由 VAVA 審核
                </p>
              </div>

              {/* Summary */}
              <div className="space-y-2 rounded-2xl border border-border bg-card p-5 text-sm">
                <SummaryRow label="顯示名稱" value={displayName} />
                {studioName && <SummaryRow label="工作室名稱" value={studioName} />}
                <SummaryRow label="手機" value={phone} />
                <SummaryRow label="性別" value={GENDER_OPTIONS.find(g => g.value === gender)?.label ?? ''} />
                {igHandle && <SummaryRow label="Instagram" value={`@${igHandle}`} />}
                <SummaryRow label="地址" value={studioAddress} />
                <SummaryRow label="服務類型" value={DOMAIN_OPTIONS.find(d => d.value === domain)?.label ?? ''} />
                {nailScope && <SummaryRow label="美甲範圍" value={NAIL_SCOPE_OPTIONS.find(n => n.value === nailScope)?.label ?? ''} />}
                <SummaryRow label="開啟服務" value={`${services.filter(s => s.enabled).length} 項`} />
                <SummaryRow label="遲到容許" value={`${noShowWindow} 分鐘`} />
                <SummaryRow label="作品集" value={`${portfolioFiles.length} 張`} />
                <SummaryRow label="證件" value={idPhotoFile ? '已上傳' : '—'} />
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {uploadProgress && (
                <p className="text-center text-sm text-muted-foreground">{uploadProgress}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="h-14 w-full rounded-2xl text-base font-semibold"
              >
                {loading ? uploadProgress || '提交中⋯' : '提交審核'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                提交後即表示你同意 VAVA 設計師服務條款
              </p>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}

// ── Small helper component ────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  )
}
