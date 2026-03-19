'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { toggleAccepting } from '@/app/(pro)/dashboard/actions'

type Props = {
  initialValue: boolean
}

export function AcceptingToggle({ initialValue }: Props) {
  const [isAccepting, setIsAccepting] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  function handleToggle(checked: boolean) {
    setIsAccepting(checked) // optimistic
    startTransition(async () => {
      const result = await toggleAccepting(checked)
      if (result.error) {
        setIsAccepting(!checked) // revert
      }
    })
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">
          {isAccepting ? '接單中' : '未接單'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isAccepting
            ? '顧客可以找到你並預約'
            : '你不會出現在搜尋結果中'}
        </p>
      </div>
      <Switch
        checked={isAccepting}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </div>
  )
}
