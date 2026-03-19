'use client'

import { useState, useTransition } from 'react'
import type { Pro } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateSettings } from '@/app/(pro)/dashboard/actions'

type Props = {
  pro: Pro
}

export function SettingsForm({ pro }: Props) {
  const [displayName, setDisplayName] = useState(pro.display_name)
  const [studioAddress, setStudioAddress] = useState(pro.studio_address)
  const [igHandle, setIgHandle] = useState(pro.ig_handle)
  const [phone, setPhone] = useState(pro.phone)
  const [noShowWindow, setNoShowWindow] = useState(pro.no_show_window_minutes)

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Track which fields would trigger re-review
  const nameChanged = displayName !== pro.display_name
  const addressChanged = studioAddress !== pro.studio_address
  const needsReReview = nameChanged || addressChanged

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

    startTransition(async () => {
      const result = await updateSettings({
        display_name: displayName.trim(),
        studio_address: studioAddress.trim(),
        ig_handle: igHandle.trim(),
        phone: phone.trim(),
        no_show_window_minutes: noShowWindow,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Re-review warning */}
      {needsReReview && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          修改顯示名稱或工作室地址需要重新審核
        </div>
      )}

      {/* Display name */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          顯示名稱
          {nameChanged && <span className="text-yellow-600 ml-1">需審核</span>}
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
          {addressChanged && <span className="text-yellow-600 ml-1">需審核</span>}
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

      {/* Portfolio photos */}
      <div className="space-y-1">
        <label className="text-sm font-medium">作品集</label>
        <p className="text-xs text-muted-foreground">
          最少 3 張（{pro.portfolio_photos.length} 張）
        </p>
        <div className="grid grid-cols-3 gap-2">
          {pro.portfolio_photos.map((url, i) => (
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

      {/* Error / Success */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">已儲存</p>}

      {/* Save */}
      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? '儲存中...' : '儲存設定'}
      </Button>
    </div>
  )
}
