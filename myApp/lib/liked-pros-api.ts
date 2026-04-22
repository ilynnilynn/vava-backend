// lib/liked-pros-api.ts
import { supabase } from './supabase'
import type { LikedPro } from '@/types/liked-pros'

const USE_MOCK = true

const MOCK_LIKED_PROS: LikedPro[] = [
  { pro_id: 'mock-pro-1', pro_display_name: 'Joy',  service_domain: 'nails',  profile_photo_url: null },
  { pro_id: 'mock-pro-2', pro_display_name: 'Momo', service_domain: 'lashes', profile_photo_url: null },
]

// Mutable set so likePro / unlikePro work in mock mode
const mockLikedIds = new Set<string>(MOCK_LIKED_PROS.map((p) => p.pro_id))

export async function fetchLikedPros(): Promise<LikedPro[]> {
  if (USE_MOCK) return MOCK_LIKED_PROS.filter((p) => mockLikedIds.has(p.pro_id))
  throw new Error('fetchLikedPros: real backend not yet implemented')
}

export async function likePro(proId: string): Promise<void> {
  if (USE_MOCK) { mockLikedIds.add(proId); return }
  const { error } = await supabase.from('liked_pros').insert({ pro_id: proId })
  if (error) throw new Error(error.message)
}

export async function unlikePro(proId: string): Promise<void> {
  if (USE_MOCK) { mockLikedIds.delete(proId); return }
  const { error } = await supabase.from('liked_pros').delete().eq('pro_id', proId)
  if (error) throw new Error(error.message)
}

export function isProLiked(proId: string, likedPros: LikedPro[]): boolean {
  return likedPros.some((p) => p.pro_id === proId)
}
