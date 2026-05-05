// lib/notifications-api.ts
import { supabase } from './supabase'
import type { NotificationListItem } from '@/types/notification'

export async function fetchNotifications(): Promise<NotificationListItem[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, booking_id, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as NotificationListItem[]
}

export async function hasUnreadNotifications(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  if (error) return false
  return (count ?? 0) > 0
}

export async function markAsRead(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) throw error
}

export async function markAllAsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.user.id)
    .eq('is_read', false)

  if (error) throw error
}
