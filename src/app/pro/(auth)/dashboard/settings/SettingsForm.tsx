'use client'

import { useState, useTransition } from 'react'
import type { Pro } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateSettings } from '@/app/pro/(auth)/dashboard/actions'

type Props = {
  pro: Pro
}

export function SettingsForm({ pro }: Props) {
  const [displayName, setDisplayName] = useState(pro.display_name ?? '')
  const [studioAddress, setStudioAddress] = useState(pro.studio_address ?? '')
  const [igHandle, setIgHandle] = useState(pro.ig_handle ?? '')
  const [phone, setPhone] = useState(pro.phone ?? '')
  const [noShowWindow, setNoShowWindow] = useState(pro.no_show_window_minutes)
  const [workStartHour, setWorkStartHour] = useState(pro.work_start_hour ?? 10)
  const [workEndHour, setWorkEndHour] = useState(pro.work_end_hour ?? 20)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Track which fields would trigger re-review
  const nameChanged = displayName !== pro.display_name
  const addressChanged = studioAddress !== pro.studio_address
  const needsReReview = nameChanged || addressChanged

  const [showReReviewConfirm, setShowReReviewConfirm] = useState(false)

  function doSave() {
    startTransition(async () => {
      const result = await updateSettings({
        display_name: displayName.trim(),
        studio_address: studioAddress.trim(),
        ig_handle: igHandle.trim(),
        phone: phone.trim(),
        no_show_window_minutes: noShowWindow,
        work_start_hour: workStartHour,
        work_end_hour: workEndHour,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
      setShowReReviewConfirm(false)
    })
  }

  function handleSave() {
    setError(null)
    setSuccess(false)

    if (!displayName.trim()) {
      setError('顯示名稱不能為空')
      return
    }
    if (!studioAddress.trim()) {
      setError('工作室地址不能為空')
      return
    }
    if (!phone.trim()) {
      setError('電話不能為空')
      return
    }
    if (workStartHour >= workEndHour) {
      setError('營業開始時間必須早於結束時間')
      return
    }

    if (needsReReview) {
      setShowReReviewConfirm(true)
      return
    }

    doSave()
  }

  return (
    <div className="space-y-4">
      {/* Re-review warning */}
      {needsReReview && (
        <div className="rounded-lg border border-warning bg-warning-muted p-3 text-sm text-warning-foreground">
          修改顯示名稱或工作室地址需要重新審核
        </div>
      )}

      {/* Display name */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          顯示名稱
          {nameChanged && <span className="text-warning ml-1">需審核</span>}
        </label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      {/* Studio address */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          工作室地址
          {addressChanged && <span className="text-warning ml-1">需審核</span>}
        </label>
        <Input
          value={studioAddress}
          onChange={(e) => setStudioAddress(e.target.value)}
        />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="text-sm font-medium">電話</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
        />
      </div>

      {/* IG handle */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Instagram</label>
        <Input
          value={igHandle}
          onChange={(e) => setIgHandle(e.target.value)}
          placeholder="@your_handle"
        />
      </div>

      {/* No-show window */}
      <div className="space-y-1">
        <label className="text-sm font-medium">遲到容許時間</label>
        <p className="text-xs text-muted-foreground">
          超過此時間可標記客戶未到場（僅影響未來預約）
        </p>
        <div className="flex gap-2">
          {([10, 15, 20] as const).map((mins) => (
            <Button
              key={mins}
              size="sm"
              variant={noShowWindow === mins ? 'default' : 'outline'}
              onClick={() => setNoShowWindow(mins)}
            >
              {mins} 分鐘
            </Button>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div className="space-y-1">
        <label className="text-sm font-medium">營業時間</label>
        <p className="text-xs text-muted-foreground">
          設定時段管理頁面顯示的時間範圍
        </p>
        <div className="flex items-center gap-2">
          <select
            value={workStartHour}
            onChange={(e) => setWorkStartHour(Number(e.target.value))}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, '0')}:00
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">至</span>
          <select
            value={workEndHour}
            onChange={(e) => setWorkEndHour(Number(e.target.value))}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portfolio photos */}
      <div className="space-y-1">
        <label className="text-sm font-medium">作品集</label>
        <p className="text-xs text-muted-foreground">
          最少 3 張（{pro.portfolio_photos?.length ?? 0} 張）
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(pro.portfolio_photos ?? []).map((url, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted border overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`作品 ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gender (read-only) */}
      <div className="space-y-1">
        <label className="text-sm font-medium">性別</label>
        <p className="text-sm text-muted-foreground">
          {pro.gender === 'male' ? '男' : pro.gender === 'female' ? '女' : '非二元'}
          <span className="text-xs ml-2">（如需修改請聯繫客服）</span>
        </p>
      </div>

      {/* Re-review confirmation dialog */}
      {showReReviewConfirm && (
        <div className="rounded-lg border border-warning bg-warning-muted p-4 space-y-3">
          <p className="text-sm font-medium text-warning-foreground">
            修改顯示名稱或地址將暫時下架您的帳號，直到管理員重新審核。確定要修改嗎？
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReReviewConfirm(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={doSave}
              disabled={isPending}
            >
              {isPending ? '儲存中...' : '確認修改'}
            </Button>
          </div>
        </div>
      )}

      {/* Error / Success */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">已儲存</p>}

      {/* Save */}
      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? '儲存中...' : '儲存設定'}
      </Button>
    </div>
  )
}
