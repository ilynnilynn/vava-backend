import { supabase } from './supabase'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://vava.tw'

async function getAuthHeaders(): Promise<Record<string, string>> {
  // TODO: Auth session must be configured for API calls to work in production.
  // Currently returns empty headers if no session exists.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}
