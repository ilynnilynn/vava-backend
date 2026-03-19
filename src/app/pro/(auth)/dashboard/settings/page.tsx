import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold">設定</h1>
        <p className="text-sm text-muted-foreground">
          管理你的個人資料與偏好設定
        </p>
      </div>

      <SettingsForm pro={pro} />
    </div>
  )
}
