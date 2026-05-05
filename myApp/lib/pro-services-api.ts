// lib/pro-services-api.ts
import { supabase } from './supabase'
import type { ServiceItem } from '@/types/pro'

// Helper: get the current user's pro.id
async function getProId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', session.user.id)
    .single()
  return data?.id ?? null
}

export async function fetchProServices(): Promise<ServiceItem[]> {
  const proId = await getProId()
  if (!proId) return []

  const { data, error } = await supabase
    .from('pro_services')
    .select(`
      id, price_ntd, duration_minutes, body_part,
      service_categories!inner(domain, name),
      service_style_modifiers(key)
    `)
    .eq('pro_id', proId)
    .eq('is_enabled', true)

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    domain: row.service_categories.domain as 'nails' | 'lashes',
    category_key: row.service_categories.name as string,
    style_key: (row.service_style_modifiers?.key as string) ?? null,
    body_part: (row.body_part as 'hand' | 'foot') ?? null,
    duration_minutes: row.duration_minutes as number,
    price: row.price_ntd as number,
  }))
}

export async function saveProService(
  item: Omit<ServiceItem, 'id'> & { id?: string }
): Promise<ServiceItem> {
  const proId = await getProId()
  if (!proId) throw new Error('Not authenticated as pro')

  // Resolve category_id from category name
  const { data: cat, error: catError } = await supabase
    .from('service_categories')
    .select('id')
    .eq('name', item.category_key)
    .single()
  if (catError || !cat) throw new Error(`Category not found: ${item.category_key}`)

  // Resolve style_id from style key (optional)
  let styleId: string | null = null
  if (item.style_key) {
    const { data: style } = await supabase
      .from('service_style_modifiers')
      .select('id')
      .eq('key', item.style_key)
      .single()
    styleId = style?.id ?? null
  }

  const payload = {
    pro_id: proId,
    category_id: cat.id,
    style_id: styleId,
    price_ntd: item.price,
    duration_minutes: item.duration_minutes,
    body_part: item.body_part,
  }

  if (item.id) {
    const { error } = await supabase
      .from('pro_services')
      .update({ ...payload, is_enabled: true })
      .eq('id', item.id)
    if (error) throw error
    return { ...item, id: item.id, body_part: item.body_part ?? null }
  }

  // Check for a soft-deleted row we can re-enable
  let matchQuery = supabase
    .from('pro_services')
    .select('id')
    .eq('pro_id', proId)
    .eq('category_id', cat.id)
    .eq('is_enabled', false)
  if (styleId) matchQuery = matchQuery.eq('style_id', styleId)
  else matchQuery = matchQuery.is('style_id', null)
  if (item.body_part) matchQuery = matchQuery.eq('body_part', item.body_part)
  else matchQuery = matchQuery.is('body_part', null)

  const { data: existing } = await matchQuery.maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('pro_services')
      .update({ ...payload, is_enabled: true })
      .eq('id', existing.id)
    if (error) throw error
    return { ...item, id: existing.id, body_part: item.body_part ?? null }
  }

  const { data: inserted, error } = await supabase
    .from('pro_services')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error
  return { ...item, id: inserted.id, body_part: item.body_part ?? null }
}

/**
 * Bulk-save multiple pro service items in a single insert.
 * Batch-resolves category/style IDs, then does one `.insert([...])`.
 */
export async function bulkSaveProServices(
  items: Omit<ServiceItem, 'id'>[]
): Promise<ServiceItem[]> {
  if (items.length === 0) return []

  const proId = await getProId()
  if (!proId) throw new Error('Not authenticated as pro')

  // Batch-resolve category IDs
  const categoryKeys = [...new Set(items.map(i => i.category_key))]
  const { data: cats, error: catError } = await supabase
    .from('service_categories')
    .select('id, name')
    .in('name', categoryKeys)
  if (catError) throw catError
  const catMap = new Map((cats ?? []).map(c => [c.name, c.id]))

  // Batch-resolve style IDs
  const styleKeys = [...new Set(items.map(i => i.style_key).filter(Boolean))] as string[]
  const styleMap = new Map<string, string>()
  if (styleKeys.length > 0) {
    const { data: styles, error: styleError } = await supabase
      .from('service_style_modifiers')
      .select('id, key')
      .in('key', styleKeys)
    if (styleError) throw styleError
    for (const s of styles ?? []) styleMap.set(s.key, s.id)
  }

  // Fetch all soft-deleted rows for this pro to check for re-enablement
  const { data: deletedRows } = await supabase
    .from('pro_services')
    .select('id, category_id, style_id, body_part')
    .eq('pro_id', proId)
    .eq('is_enabled', false)

  const deletedMap = new Map<string, string>() // composite key → row id
  for (const row of deletedRows ?? []) {
    const key = `${row.category_id}|${row.style_id ?? ''}|${row.body_part ?? ''}`
    deletedMap.set(key, row.id)
  }

  const toInsert: { payload: Record<string, unknown>; itemIndex: number }[] = []
  const toReEnable: { id: string; payload: Record<string, unknown>; itemIndex: number }[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const categoryId = catMap.get(item.category_key)
    if (!categoryId) throw new Error(`Category not found: ${item.category_key}`)
    const resolvedStyleId = item.style_key ? (styleMap.get(item.style_key) ?? null) : null

    const payload = {
      pro_id: proId,
      category_id: categoryId,
      style_id: resolvedStyleId,
      price_ntd: item.price,
      duration_minutes: item.duration_minutes,
      body_part: item.body_part,
    }

    const compositeKey = `${categoryId}|${resolvedStyleId ?? ''}|${item.body_part ?? ''}`
    const existingId = deletedMap.get(compositeKey)

    if (existingId) {
      toReEnable.push({ id: existingId, payload: { ...payload, is_enabled: true }, itemIndex: i })
      deletedMap.delete(compositeKey) // avoid double-match
    } else {
      toInsert.push({ payload, itemIndex: i })
    }
  }

  // Re-enable soft-deleted rows
  const resultIds: { index: number; id: string }[] = []
  for (const entry of toReEnable) {
    const { error } = await supabase
      .from('pro_services')
      .update(entry.payload)
      .eq('id', entry.id)
    if (error) throw error
    resultIds.push({ index: entry.itemIndex, id: entry.id })
  }

  // Insert truly new rows
  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from('pro_services')
      .insert(toInsert.map(e => e.payload))
      .select('id')
    if (error) throw error
    toInsert.forEach((entry, i) => {
      resultIds.push({ index: entry.itemIndex, id: inserted![i].id })
    })
  }

  // Build ordered result
  const idByIndex = new Map(resultIds.map(r => [r.index, r.id]))
  return items.map((item, i) => ({
    ...item,
    id: idByIndex.get(i)!,
    body_part: item.body_part ?? null,
  }))
}

export async function deleteProService(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Soft delete — preserves historical booking data
  const { error } = await supabase
    .from('pro_services')
    .update({ is_enabled: false })
    .eq('id', id)
  if (error) throw error
}
