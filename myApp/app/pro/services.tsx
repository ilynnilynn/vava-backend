// app/pro/services.tsx
import {
  Alert, KeyboardAvoidingView, LayoutAnimation, Modal,
  Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { SelectionChip } from '@/components/booking/SelectionChip'
import { useEffect, useState } from 'react'
import type { ServiceItem, BodyPart } from '@/types/pro'
import {
  SERVICE_CATALOG, getCategoryDef, getCatalogItem,
  type ServiceDomain, type CategoryDef,
} from '@/constants/service-catalog'
import {
  fetchProServices, saveProService, deleteProService, bulkSaveProServices,
} from '@/lib/pro-services-api'

const DURATION_OPTIONS = [30, 45, 60, 90, 120]
const DOMAINS: { key: ServiceDomain; label: string }[] = [
  { key: 'nails', label: '美甲' },
  { key: 'lashes', label: '美睫' },
]

const BODY_PARTS: { key: BodyPart; label: string }[] = [
  { key: 'hand', label: '手' },
  { key: 'foot', label: '腳' },
]

// ── Helpers ──────────────────────────────────────────────────

function getRowLabel(item: ServiceItem): string {
  const cat = getCategoryDef(item.domain, item.category_key)
  const catName = cat?.name_zh ?? item.category_key
  if (item.style_key) {
    const ci = getCatalogItem(item.domain, item.category_key, item.style_key)
    const styleName = ci ? (ci.group_zh ? `${ci.group_zh}${ci.name_zh}` : ci.name_zh) : item.style_key
    if (item.body_part) {
      const bpLabel = item.body_part === 'hand' ? '手' : '腳'
      return `${bpLabel} · ${catName} · ${styleName}`
    }
    return `${catName} · ${styleName}`
  }
  if (item.body_part) {
    const bpLabel = item.body_part === 'hand' ? '手' : '腳'
    return `${bpLabel} · ${catName}`
  }
  return catName
}

type BodyPartGroup = {
  bodyPart: BodyPart
  categoryGroups: CategoryGroup[]
}

type CategoryGroup = {
  category: CategoryDef
  items: ServiceItem[]
}

function groupNailsByBodyPart(services: ServiceItem[]): BodyPartGroup[] {
  const nailItems = services.filter(s => s.domain === 'nails')
  const result: BodyPartGroup[] = []
  for (const bp of ['hand', 'foot'] as BodyPart[]) {
    const bpItems = nailItems.filter(s => s.body_part === bp)
    if (bpItems.length === 0) continue
    const catGroups = groupItemsByCategory(bpItems, 'nails')
    result.push({ bodyPart: bp, categoryGroups: catGroups })
  }
  // Items with null body_part (legacy)
  const nullBp = nailItems.filter(s => !s.body_part)
  if (nullBp.length > 0) {
    const catGroups = groupItemsByCategory(nullBp, 'nails')
    result.push({ bodyPart: 'hand', categoryGroups: catGroups }) // show under hand
  }
  return result
}

function groupItemsByCategory(items: ServiceItem[], domain: ServiceDomain): CategoryGroup[] {
  const catMap = new Map<string, ServiceItem[]>()
  for (const item of items) {
    const arr = catMap.get(item.category_key) ?? []
    arr.push(item)
    catMap.set(item.category_key, arr)
  }

  const catalogOrder = SERVICE_CATALOG[domain].map(c => c.key)
  const groups: CategoryGroup[] = []
  for (const catKey of catalogOrder) {
    const catItems = catMap.get(catKey)
    if (!catItems) continue
    const cat = getCategoryDef(domain, catKey)
    if (cat) groups.push({ category: cat, items: catItems })
  }
  return groups
}

function groupByCategory(services: ServiceItem[], domain: ServiceDomain): CategoryGroup[] {
  const domainItems = services.filter(s => s.domain === domain)
  return groupItemsByCategory(domainItems, domain)
}

// ── Add flow types ───────────────────────────────────────────

type AddStep = 'domain' | 'body_part' | 'category' | 'details'

type PriceRow = {
  styleKey: string | null
  label: string
  group_zh?: string
  duration_minutes: number
  price: string
  isDeleted: boolean
}

// ── Component ────────────────────────────────────────────────

export default function ServicesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDomain, setActiveDomain] = useState<ServiceDomain>('nails')

  // Add sheet state
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState<AddStep>('domain')
  const [addDomain, setAddDomain] = useState<ServiceDomain>('nails')
  const [addBodyPart, setAddBodyPart] = useState<BodyPart | null>(null)
  const [addCategory, setAddCategory] = useState<CategoryDef | null>(null)
  const [addRows, setAddRows] = useState<PriceRow[]>([])
  const [saving, setSaving] = useState(false)

  // Edit sheet state
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<ServiceItem | null>(null)
  const [editDuration, setEditDuration] = useState(60)
  const [editPrice, setEditPrice] = useState('')

  useEffect(() => {
    fetchProServices()
      .then(data => setServices(data))
      .catch(() => {}) // fail silently — tables may not exist yet
      .finally(() => setLoading(false))
  }, [])

  // ── Add flow ─────────────────────────────────────────────

  function openAdd() {
    setAddStep('domain')
    setAddDomain(activeDomain)
    setAddBodyPart(null)
    setAddCategory(null)
    setAddRows([])
    setSaving(false)
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
  }

  function addStepBack() {
    switch (addStep) {
      case 'domain': closeAdd(); break
      case 'body_part': setAddStep('domain'); break
      case 'category':
        setAddStep(addDomain === 'nails' ? 'body_part' : 'domain')
        break
      case 'details': setAddStep('category'); break
    }
  }

  function selectAddDomain(d: ServiceDomain) {
    setAddDomain(d)
    setAddBodyPart(null)
    setAddCategory(null)
    setAddRows([])
    if (d === 'nails') {
      setAddStep('body_part')
    } else {
      setAddStep('category')
    }
  }

  function selectAddBodyPart(bp: BodyPart) {
    setAddBodyPart(bp)
    setAddCategory(null)
    setAddRows([])
    setAddStep('category')
  }

  function getAvailableCategories(): CategoryDef[] {
    const cats = SERVICE_CATALOG[addDomain]
    return cats.filter(cat => {
      // Check if ALL items in this category are already added
      const addedStyleKeys = services
        .filter(s =>
          s.domain === addDomain &&
          s.category_key === cat.key &&
          (addDomain === 'nails' ? s.body_part === addBodyPart : true)
        )
        .map(s => s.style_key)
      return cat.items.some(item => !addedStyleKeys.includes(item.key))
    })
  }

  function selectAddCategory(cat: CategoryDef) {
    setAddCategory(cat)
    // Pre-populate ALL items for this category, filtering out already-added
    const addedStyleKeys = new Set(
      services
        .filter(s =>
          s.domain === addDomain &&
          s.category_key === cat.key &&
          (addDomain === 'nails' ? s.body_part === addBodyPart : true)
        )
        .map(s => s.style_key)
    )
    const rows: PriceRow[] = cat.items
      .filter(item => !addedStyleKeys.has(item.key))
      .map(item => ({
        styleKey: item.key,
        label: item.name_zh,
        group_zh: item.group_zh,
        duration_minutes: 60,
        price: '',
        isDeleted: false,
      }))
    setAddRows(rows)
    setAddStep('details')
  }

  function deleteAddRow(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setAddRows(prev => prev.filter((_, i) => i !== index))
  }

  function updateAddRow(index: number, field: 'duration_minutes' | 'price', value: number | string) {
    setAddRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function pickAddDuration(index: number) {
    Alert.alert('服務時長', undefined, [
      ...DURATION_OPTIONS.map(d => ({
        text: `${d} 分鐘`,
        onPress: () => updateAddRow(index, 'duration_minutes', d),
      })),
      { text: '取消', style: 'cancel' as const },
    ])
  }

  async function handleAddSave() {
    const activeRows = addRows.filter(r => !r.isDeleted)
    if (activeRows.length === 0) {
      Alert.alert('請至少保留一個項目')
      return
    }
    for (const row of activeRows) {
      const price = parseInt(row.price, 10)
      if (isNaN(price) || price <= 0) {
        Alert.alert('請填寫完整價格')
        return
      }
    }
    if (!addCategory) return

    setSaving(true)
    try {
      const itemsToSave = activeRows.map(row => ({
        domain: addDomain,
        category_key: addCategory.key,
        style_key: row.styleKey,
        body_part: addDomain === 'nails' ? addBodyPart : null,
        duration_minutes: row.duration_minutes,
        price: parseInt(row.price, 10),
      }))
      const newItems = await bulkSaveProServices(itemsToSave)
      setServices(prev => [...prev, ...newItems])
      setAddOpen(false)
    } catch {
      Alert.alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit flow ────────────────────────────────────────────

  function openEdit(item: ServiceItem) {
    setEditItem(item)
    setEditDuration(item.duration_minutes)
    setEditPrice(String(item.price))
    setEditOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditItem(null)
  }

  function pickEditDuration() {
    Alert.alert('服務時長', undefined, [
      ...DURATION_OPTIONS.map(d => ({
        text: `${d} 分鐘`,
        onPress: () => setEditDuration(d),
      })),
      { text: '取消', style: 'cancel' as const },
    ])
  }

  async function handleEditSave() {
    if (!editItem) return
    const price = parseInt(editPrice, 10)
    if (isNaN(price) || price <= 0) {
      Alert.alert('請填寫完整價格')
      return
    }
    const updated: ServiceItem = { ...editItem, duration_minutes: editDuration, price }
    await saveProService(updated)
    setServices(prev => prev.map(s => s.id === editItem.id ? updated : s))
    setEditOpen(false)
    setEditItem(null)
  }

  function handleDelete() {
    if (!editItem) return
    const label = getRowLabel(editItem)
    Alert.alert(`刪除「${label}」？`, '此操作無法復原', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteProService(editItem.id)
          setServices(prev => prev.filter(s => s.id !== editItem.id))
          setEditOpen(false)
          setEditItem(null)
        },
      },
    ])
  }

  // ── Render helpers ────────────────────────────────────────

  function renderServiceRow(item: ServiceItem, label: string) {
    return (
      <XStack
        key={item.id}
        paddingVertical={14}
        paddingHorizontal={20}
        justifyContent="space-between"
        alignItems="center"
      >
        <YStack flex={1} gap={3}>
          <Text fontSize={15} fontWeight="600" color="#1F2723">{label}</Text>
          <Text fontSize={13} color="#626765">
            {item.duration_minutes} 分鐘 · NT${item.price}
          </Text>
        </YStack>
        <Pressable
          onPress={() => openEdit(item)}
          accessibilityLabel={`編輯 ${label}`}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <AppIcon name="edit" size={14} color="#626765" />
        </Pressable>
      </XStack>
    )
  }

  // Group add rows by group_zh for lashes new_set
  function getGroupedAddRows(): { group: string | null; rows: { row: PriceRow; index: number }[] }[] {
    const activeRows = addRows.map((row, index) => ({ row, index })).filter(r => !r.row.isDeleted)
    if (!addCategory || addCategory.key !== 'new_set') {
      return [{ group: null, rows: activeRows }]
    }
    const groups: { group: string | null; rows: { row: PriceRow; index: number }[] }[] = []
    let currentGroup: string | null = null
    let currentRows: { row: PriceRow; index: number }[] = []
    for (const entry of activeRows) {
      const g = entry.row.group_zh ?? null
      if (g !== currentGroup) {
        if (currentRows.length > 0) groups.push({ group: currentGroup, rows: currentRows })
        currentGroup = g
        currentRows = []
      }
      currentRows.push(entry)
    }
    if (currentRows.length > 0) groups.push({ group: currentGroup, rows: currentRows })
    return groups
  }

  // ── Render ───────────────────────────────────────────────

  const isEmpty = services.length === 0 && !loading
  const isNailsDomain = activeDomain === 'nails'
  const nailsGroups = isNailsDomain ? groupNailsByBodyPart(services) : []
  const lashesGroups = !isNailsDomain ? groupByCategory(services, 'lashes') : []
  const domainEmpty = isNailsDomain
    ? nailsGroups.length === 0 && !loading
    : lashesGroups.length === 0 && !loading

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={20}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <Text fontSize={20} fontWeight="700" color="#1F2723" flex={1}>服務項目</Text>
        <Pressable
          onPress={openAdd}
          accessibilityLabel="新增服務"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <AppIcon name="add" size={20} color="#1F2723" />
        </Pressable>
      </XStack>

      {/* Domain filter pills */}
      <XStack paddingHorizontal={20} paddingBottom={12} gap={8}>
        {DOMAINS.map(d => (
          <Pressable
            key={d.key}
            onPress={() => setActiveDomain(d.key)}
            style={({ pressed }) => [
              styles.pill,
              activeDomain === d.key && styles.pillActive,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              fontSize={14}
              fontWeight="600"
              lineHeight={20}
              color={activeDomain === d.key ? '#FBFBF8' : '#1F2723'}
            >
              {d.label}
            </Text>
          </Pressable>
        ))}
      </XStack>

      {/* Empty state — no services at all */}
      {isEmpty && (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12} paddingBottom={80}>
          <AppIcon name="serviceGeneric" size={48} color="#E8E9E9" />
          <Text fontSize={16} fontWeight="600" color="#626765" textAlign="center">尚未新增服務項目</Text>
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text fontSize={15} fontWeight="700" color="#fff">新增服務</Text>
          </Pressable>
        </YStack>
      )}

      {/* Empty state — this domain has no services yet */}
      {!isEmpty && domainEmpty && (
        <YStack flex={1} alignItems="center" justifyContent="center" gap={12} paddingBottom={80}>
          <AppIcon name="serviceGeneric" size={48} color="#E8E9E9" />
          <Text fontSize={16} fontWeight="600" color="#626765" textAlign="center">
            尚未新增{DOMAINS.find(d => d.key === activeDomain)?.label}服務
          </Text>
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text fontSize={15} fontWeight="700" color="#fff">新增服務</Text>
          </Pressable>
        </YStack>
      )}

      {/* Service list — Nails (grouped by body part → category) */}
      {!domainEmpty && !isEmpty && isNailsDomain && (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {nailsGroups.map(bpGroup => (
            <View key={bpGroup.bodyPart}>
              <Text style={styles.bodyPartHeader}>
                {bpGroup.bodyPart === 'hand' ? '手' : '腳'}
              </Text>
              {bpGroup.categoryGroups.map(group => (
                <View key={group.category.key}>
                  <Text style={styles.categoryHeader}>{group.category.name_zh}</Text>
                  {group.items.map((item, idx) => {
                    const ci = item.style_key
                      ? getCatalogItem(item.domain, item.category_key, item.style_key)
                      : null
                    const label = ci
                      ? (ci.group_zh ? `${ci.group_zh}${ci.name_zh}` : ci.name_zh)
                      : group.category.name_zh
                    return (
                      <View key={item.id}>
                        {idx > 0 && <View style={styles.divider} />}
                        {renderServiceRow(item, label)}
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Service list — Lashes (flat category grouping) */}
      {!domainEmpty && !isEmpty && !isNailsDomain && (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {lashesGroups.map(group => (
            <View key={group.category.key}>
              <Text style={styles.categoryHeader}>{group.category.name_zh}</Text>
              {group.items.map((item, idx) => {
                const ci = item.style_key
                  ? getCatalogItem(item.domain, item.category_key, item.style_key)
                  : null
                const label = ci
                  ? (ci.group_zh ? `${ci.group_zh}${ci.name_zh}` : ci.name_zh)
                  : group.category.name_zh
                return (
                  <View key={item.id}>
                    {idx > 0 && <View style={styles.divider} />}
                    {renderServiceRow(item, label)}
                  </View>
                )
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Add Screen ────────────────────────────────────── */}
      <Modal
        visible={addOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeAdd}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#FBFBF8' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <XStack
            paddingHorizontal={20}
            paddingTop={insets.top + 16}
            paddingBottom={12}
            alignItems="center"
          >
            <Pressable
              onPress={addStepBack}
              accessibilityLabel="返回"
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
            >
              <AppIcon name="back" size={20} color="#1F2723" />
            </Pressable>
            <Text fontSize={20} fontWeight="700" color="#1F2723" flex={1}>新增服務</Text>
            <Pressable
              onPress={closeAdd}
              accessibilityLabel="關閉"
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <AppIcon name="close" size={20} color="#1F2723" />
            </Pressable>
          </XStack>

          {/* Context pills (domain + body part) */}
          {addStep !== 'domain' && (
            <XStack paddingHorizontal={20} paddingBottom={12} gap={8}>
              <View style={[styles.pill, styles.pillActive]}>
                <Text fontSize={14} fontWeight="600" lineHeight={20} color="#FBFBF8">
                  {DOMAINS.find(d => d.key === addDomain)?.label}
                </Text>
              </View>
              {addBodyPart && addStep !== 'body_part' && (
                <View style={[styles.pill, styles.pillActive]}>
                  <Text fontSize={14} fontWeight="600" lineHeight={20} color="#FBFBF8">
                    {BODY_PARTS.find(b => b.key === addBodyPart)?.label}
                  </Text>
                </View>
              )}
            </XStack>
          )}

          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step: Domain picker */}
            {addStep === 'domain' && (
              <YStack paddingHorizontal={20} paddingTop={20} gap={16}>
                <Text fontSize={15} fontWeight="600" color="#1F2723">選擇服務類型</Text>
                <XStack gap={10}>
                  {DOMAINS.map(d => (
                    <SelectionChip
                      key={d.key}
                      label={d.label}
                      selected={false}
                      onPress={() => selectAddDomain(d.key)}
                    />
                  ))}
                </XStack>
              </YStack>
            )}

            {/* Step: Body part picker (nails only) */}
            {addStep === 'body_part' && (
              <YStack paddingHorizontal={20} paddingTop={20} gap={16}>
                <Text fontSize={15} fontWeight="600" color="#1F2723">選擇手/腳</Text>
                <XStack gap={10}>
                  {BODY_PARTS.map(bp => (
                    <SelectionChip
                      key={bp.key}
                      label={bp.label}
                      selected={false}
                      onPress={() => selectAddBodyPart(bp.key)}
                    />
                  ))}
                </XStack>
              </YStack>
            )}

            {/* Step: Category picker */}
            {addStep === 'category' && (
              <YStack gap={4}>
                <Text style={styles.sheetSectionLabel}>選擇服務項目</Text>
                {getAvailableCategories().map(cat => (
                  <Pressable
                    key={cat.key}
                    onPress={() => selectAddCategory(cat)}
                    style={({ pressed }) => [styles.categoryRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text fontSize={15} color="#1F2723" flex={1}>{cat.name_zh}</Text>
                    <AppIcon name="forward" size={12} color="#BBBEBD" />
                  </Pressable>
                ))}
                {getAvailableCategories().length === 0 && (
                  <Text fontSize={14} color="#626765" paddingHorizontal={20} paddingTop={12}>
                    所有服務項目皆已新增
                  </Text>
                )}
              </YStack>
            )}

            {/* Step: Details — pre-populated list */}
            {addStep === 'details' && (
              <YStack paddingTop={8} gap={4}>
                {getGroupedAddRows().map(({ group, rows }) => (
                  <View key={group ?? '__ungrouped'}>
                    {group && (
                      <Text style={styles.groupHeader}>{group}</Text>
                    )}
                    {rows.map(({ row, index }) => (
                      <YStack key={row.styleKey ?? 'no-style'} paddingHorizontal={20} paddingTop={12}>
                        <View style={styles.card}>
                          {/* Name + delete */}
                          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
                            <Text fontSize={15} fontWeight="600" color="#1F2723" flex={1}>
                              {row.label}
                            </Text>
                            <Pressable
                              onPress={() => deleteAddRow(index)}
                              hitSlop={12}
                              accessibilityLabel={`移除 ${row.label}`}
                              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                            >
                              <AppIcon name="close" size={14} color="#626765" />
                            </Pressable>
                          </XStack>

                          <View style={styles.cardDivider} />

                          {/* Duration */}
                          <Pressable
                            onPress={() => pickAddDuration(index)}
                            style={({ pressed }) => [styles.cardRow, { opacity: pressed ? 0.7 : 1 }]}
                          >
                            <Text fontSize={15} color="#626765" width={56}>時長</Text>
                            <Text fontSize={15} color="#1F2723" flex={1} textAlign="right" marginRight={6}>
                              {row.duration_minutes} 分鐘
                            </Text>
                            <AppIcon name="forward" size={12} color="#BBBEBD" />
                          </Pressable>

                          <View style={styles.cardDivider} />

                          {/* Price */}
                          <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
                            <Text fontSize={15} color="#626765" width={56}>價格</Text>
                            <XStack flex={1} justifyContent="flex-end" alignItems="center" gap={4}>
                              <Text fontSize={15} color="#626765">NT$</Text>
                              <TextInput
                                value={row.price}
                                onChangeText={v => updateAddRow(index, 'price', v.replace(/[^0-9]/g, ''))}
                                placeholder="0"
                                placeholderTextColor="#787D7B"
                                keyboardType="number-pad"
                                style={[styles.input, { textAlign: 'right' }]}
                              />
                            </XStack>
                          </XStack>
                        </View>
                      </YStack>
                    ))}
                  </View>
                ))}

                {addRows.filter(r => !r.isDeleted).length > 0 && (
                  <Pressable
                    onPress={handleAddSave}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.saveBtn,
                      { opacity: saving ? 0.5 : pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text fontSize={16} fontWeight="700" color="#fff">
                      {saving ? '儲存中...' : '儲存'}
                    </Text>
                  </Pressable>
                )}
              </YStack>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Sheet ────────────────────────────────────── */}
      <Modal
        visible={editOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#FBFBF8' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Sheet header */}
          <XStack paddingTop={20} paddingHorizontal={20} paddingBottom={12} alignItems="center">
            <Pressable
              onPress={closeEdit}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text fontSize={15} color="#626765">取消</Text>
            </Pressable>
            <Text fontSize={20} fontWeight="700" color="#1F2723" flex={1} textAlign="center">
              編輯服務
            </Text>
            <View style={{ width: 36 }} />
          </XStack>

          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {editItem && (
              <YStack paddingTop={8}>
                <Text style={styles.sheetSectionLabel}>服務資訊</Text>
                <View style={[styles.card, { marginHorizontal: 20 }]}>
                  {/* Service name (read-only) */}
                  <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
                    <Text fontSize={15} color="#626765" width={56}>名稱</Text>
                    <Text fontSize={15} color="#1F2723" flex={1} textAlign="right">
                      {getRowLabel(editItem)}
                    </Text>
                  </XStack>

                  <View style={styles.cardDivider} />

                  {/* Duration */}
                  <Pressable
                    onPress={pickEditDuration}
                    style={({ pressed }) => [styles.cardRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text fontSize={15} color="#626765" width={56}>時長</Text>
                    <Text fontSize={15} color="#1F2723" flex={1} textAlign="right" marginRight={6}>
                      {editDuration} 分鐘
                    </Text>
                    <AppIcon name="forward" size={12} color="#BBBEBD" />
                  </Pressable>

                  <View style={styles.cardDivider} />

                  {/* Price */}
                  <XStack paddingHorizontal={14} paddingVertical={12} alignItems="center">
                    <Text fontSize={15} color="#626765" width={56}>價格</Text>
                    <XStack flex={1} justifyContent="flex-end" alignItems="center" gap={4}>
                      <Text fontSize={15} color="#626765">NT$</Text>
                      <TextInput
                        value={editPrice}
                        onChangeText={v => setEditPrice(v.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        placeholderTextColor="#787D7B"
                        keyboardType="number-pad"
                        style={[styles.input, { textAlign: 'right' }]}
                      />
                    </XStack>
                  </XStack>
                </View>

                <Pressable
                  onPress={handleEditSave}
                  style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text fontSize={16} fontWeight="700" color="#fff">儲存</Text>
                </Pressable>

                <Pressable
                  onPress={handleDelete}
                  accessibilityLabel="刪除服務"
                  style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text fontSize={15} fontWeight="600" color="#CC3352">刪除服務</Text>
                </Pressable>
              </YStack>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </YStack>
  )
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#F6F4EF',
  },
  pillActive: {
    backgroundColor: '#1F2723',
  },
  bodyPartHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2723',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  categoryHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2723',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  groupHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#626765',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 16,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: '#1F2723',
    borderRadius: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#626765',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9E9',
  },
  card: {
    backgroundColor: '#F6F4EF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2723',
    textAlign: 'right',
  },
  saveBtn: {
    height: 48,
    backgroundColor: '#1F2723',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
})
