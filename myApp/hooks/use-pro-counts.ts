import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ProCounts = { nails: number; lashes: number; makeup: number }

export function useProCounts() {
  const [counts, setCounts] = useState<ProCounts>({ nails: 0, lashes: 0, makeup: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchCounts() {
      try {
        const { data: categories } = await supabase
          .from('service_categories')
          .select('id, name_zh')
          .in('name_zh', ['美甲', '美睫', '美妝'])

        if (!categories?.length || cancelled) return

        const catMap = new Map(categories.map((c: { name_zh: string; id: string }) => [c.name_zh, c.id]))

        // Count distinct pros per category via pro_services join table
        const [nailsRes, lashesRes, makeupRes] = await Promise.all([
          catMap.get('美甲')
            ? supabase.from('pro_services').select('pro_id', { count: 'exact', head: true }).eq('category_id', catMap.get('美甲')!)
            : Promise.resolve({ count: 0 }),
          catMap.get('美睫')
            ? supabase.from('pro_services').select('pro_id', { count: 'exact', head: true }).eq('category_id', catMap.get('美睫')!)
            : Promise.resolve({ count: 0 }),
          catMap.get('美妝')
            ? supabase.from('pro_services').select('pro_id', { count: 'exact', head: true }).eq('category_id', catMap.get('美妝')!)
            : Promise.resolve({ count: 0 }),
        ])

        if (!cancelled) {
          setCounts({
            nails: nailsRes.count ?? 0,
            lashes: lashesRes.count ?? 0,
            makeup: makeupRes.count ?? 0,
          })
        }
      } catch (err) {
        if (!cancelled) console.warn('Failed to fetch pro counts:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCounts()
    return () => { cancelled = true }
  }, [])

  return { counts, loading }
}
