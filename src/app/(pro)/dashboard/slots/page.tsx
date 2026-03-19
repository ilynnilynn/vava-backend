import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProSlots } from '@/lib/slots'
import { SlotManager } from './SlotManager'

export default async function SlotsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  const slots = await getProSlots(pro.id)
  const isReadOnly = pro.subscription_status === 'read_only'

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold">時段管理</h1>
        <p className="text-sm text-muted-foreground">
          管理未來 72 小時的可預約時段
        </p>
      </div>

      {isReadOnly && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          訂閱已到期，無法新增時段。請前往訂閱頁面升級。
        </div>
      )}

      <SlotManager
        initialSlots={slots}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
