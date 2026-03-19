import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ServiceList } from './ServiceList'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/pro/login')

  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!pro) redirect('/pro/login')

  // Fetch pro's services with category and style info
  const { data: services } = await supabase
    .from('pro_services')
    .select('*, service_categories(*), service_style_modifiers(*)')
    .eq('pro_id', pro.id)
    .order('category_id')

  // Fetch pro's nail packages
  const { data: packages } = await supabase
    .from('pro_nail_packages')
    .select('*')
    .eq('pro_id', pro.id)
    .order('created_at')

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold">我的服務</h1>
        <p className="text-sm text-muted-foreground">
          管理你提供的服務與價格
        </p>
      </div>

      <ServiceList
        services={services ?? []}
        packages={packages ?? []}
      />
    </div>
  )
}
