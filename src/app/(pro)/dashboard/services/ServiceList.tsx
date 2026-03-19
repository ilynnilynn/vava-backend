'use client'

import { useState, useTransition } from 'react'
import type { ProService, ProNailPackage, ServiceCategory, ServiceStyleModifier } from '@/types'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toggleService, updateServicePrice } from '@/app/(pro)/dashboard/actions'

// ── Types ───────────────────────────────────────────────────

type ServiceWithRelations = ProService & {
  service_categories: ServiceCategory | null
  service_style_modifiers: ServiceStyleModifier | null
}

type Props = {
  services: ServiceWithRelations[]
  packages: ProNailPackage[]
}

// ── Component ───────────────────────────────────────────────

export function ServiceList({ services, packages }: Props) {
  // Group services by category
  const grouped = services.reduce<Record<string, ServiceWithRelations[]>>(
    (acc, svc) => {
      const catName = svc.service_categories?.name_zh ?? '未分類'
      if (!acc[catName]) acc[catName] = []
      acc[catName].push(svc)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([catName, items]) => (
        <section key={catName} className="space-y-3">
          <h2 className="font-semibold">{catName}</h2>
          {items.map((svc) => (
            <ServiceRow key={svc.id} service={svc} />
          ))}
        </section>
      ))}

      {/* Nail packages */}
      {packages.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">套餐</h2>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium text-sm">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">
                  NT${pkg.price_ntd} / {pkg.duration_minutes}分鐘
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {pkg.is_enabled ? '已啟用' : '已停用'}
              </span>
            </div>
          ))}
        </section>
      )}

      {services.length === 0 && packages.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          尚未設定任何服務
        </p>
      )}
    </div>
  )
}

// ── Service Row ─────────────────────────────────────────────

function ServiceRow({ service }: { service: ServiceWithRelations }) {
  const [isEnabled, setIsEnabled] = useState(service.is_enabled)
  const [isEditing, setIsEditing] = useState(false)
  const [price, setPrice] = useState(String(service.price_ntd))
  const [duration, setDuration] = useState(String(service.duration_minutes))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const styleName = service.service_style_modifiers?.name_zh
  const domain = service.service_categories?.domain

  function handleToggle(checked: boolean) {
    setIsEnabled(checked)
    startTransition(async () => {
      const result = await toggleService(service.id, checked)
      if (result.error) {
        setIsEnabled(!checked)
        setError(result.error)
      }
    })
  }

  function handleSave() {
    const priceNum = parseInt(price, 10)
    const durationNum = parseInt(duration, 10)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('請輸入有效價格')
      return
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      setError('請輸入有效時長')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateServicePrice(service.id, {
        price_ntd: priceNum,
        duration_minutes: durationNum,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setIsEditing(false)
      }
    })
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">
            {service.service_categories?.name_zh}
            {styleName && ` — ${styleName}`}
          </p>
          {!isEditing && (
            <p className="text-xs text-muted-foreground">
              NT${service.price_ntd} / {service.duration_minutes}分鐘
              {domain === 'lashes' && service.density_daily_delta != null && (
                <> | 日常+${service.density_daily_delta}</>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              編輯
            </Button>
          )}
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
        </div>
      </div>

      {isEditing && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">價格 (NT$)</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">時長 (分鐘)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={15}
                step={15}
              />
            </div>
          </div>

          {/* Lash density deltas */}
          {domain === 'lashes' && (
            <div className="grid grid-cols-3 gap-2">
              <DeltaField
                label="輕盈"
                initial={service.density_light_delta}
              />
              <DeltaField
                label="日常"
                initial={service.density_daily_delta}
              />
              <DeltaField
                label="濃密"
                initial={service.density_heavy_delta}
              />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? '儲存中...' : '儲存'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false)
                setPrice(String(service.price_ntd))
                setDuration(String(service.duration_minutes))
                setError(null)
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Delta field (display-only for now, wired to save later) ─

function DeltaField({
  label,
  initial,
}: {
  label: string
  initial: number | null
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}加價</label>
      <Input
        type="number"
        defaultValue={initial ?? 0}
        min={0}
        className="text-xs"
      />
    </div>
  )
}
