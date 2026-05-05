// lib/liked-pros-api.ts
import { supabase } from './supabase'
import type { LikedPro } from '@/types/liked-pros'

export async function fetchLikedPros(): Promise<LikedPro[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  // Step 1: liked pro IDs + basic pro info
  const { data: liked, error } = await supabase
    .from('liked_pros')
    .select('pro_id, pros!inner(display_name, profile_photo_url)')
    .eq('user_id', session.user.id)

  if (error) throw error
  if (!liked?.length) return []

  const proIds = liked.map((r: any) => r.pro_id as string)

  // Step 2: derive primary domain from the pro's first enabled service
  const { data: services } = await supabase
    .from('pro_services')
    .select('pro_id, service_categories!inner(domain)')
    .in('pro_id', proIds)
    .eq('is_enabled', true)

  const domainMap = new Map<string, 'nails' | 'lashes'>()
  for (const s of services ?? []) {
    if (!domainMap.has((s as any).pro_id)) {
      domainMap.set((s as any).pro_id, (s as any).service_categories.domain)
    }
  }

  return liked.map((r: any) => ({
    pro_id: r.pro_id as string,
    pro_display_name: r.pros.display_name as string,
    service_domain: domainMap.get(r.pro_id) ?? 'nails',
    profile_photo_url: r.pros.profile_photo_url as string | null,
  }))
}

export async function likePro(proId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase
    .from('liked_pros')
    .insert({ user_id: session.user.id, pro_id: proId })

  // Ignore unique-constraint violation (already liked)
  if (error && error.code !== '23505') throw error
}

export async function unlikePro(proId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase
    .from('liked_pros')
    .delete()
    .eq('user_id', session.user.id)
    .eq('pro_id', proId)

  if (error) throw error
}

export function isProLiked(proId: string, likedPros: LikedPro[]): boolean {
  return likedPros.some((p) => p.pro_id === proId)
}
