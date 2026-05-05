// constants/service-catalog.ts — CSV-based service catalog

export type ServiceDomain = 'nails' | 'lashes' | 'makeup'
export type BodyPart = 'hand' | 'foot'

export type CatalogItem = {
  key: string        // maps to service_style_modifiers.key
  name_zh: string
  group_zh?: string  // for lash sub-type grouping (日式, 韓式, etc.)
}

export type CategoryDef = {
  key: string        // maps to service_categories.name
  name_zh: string
  domain: ServiceDomain
  items: CatalogItem[]
}

// ── Nails (same items for hand & foot) ───────────────────────────

const NAILS_CATEGORIES: CategoryDef[] = [
  {
    key: 'gel',
    name_zh: '凝膠',
    domain: 'nails',
    items: [
      { key: 'solid', name_zh: '單色' },
      { key: 'french', name_zh: '法式' },
      { key: 'gradient', name_zh: '漸層' },
      { key: 'cat_eye', name_zh: '貓眼' },
      { key: 'mirror', name_zh: '鏡面' },
      { key: 'hand_painted', name_zh: '手繪' },
      { key: 'hailey', name_zh: '海莉' },
      { key: 'design_any', name_zh: '不挑款/設計款' },
      { key: 'photo_quote', name_zh: '傳圖報價' },
      { key: 'discuss', name_zh: '到店討論' },
    ],
  },
  {
    key: 'extension',
    name_zh: '延甲',
    domain: 'nails',
    items: [
      { key: 'single_finger', name_zh: '單指' },
      { key: 'full_extension', name_zh: '全延' },
    ],
  },
  {
    key: 'nail_removal',
    name_zh: '卸甲',
    domain: 'nails',
    items: [
      { key: 'with_redo', name_zh: '續做' },
      { key: 'without_redo', name_zh: '不續做' },
    ],
  },
  {
    key: 'repair',
    name_zh: '修補',
    domain: 'nails',
    items: [
      { key: 'single_finger_repair', name_zh: '單指' },
    ],
  },
  {
    key: 'treatment',
    name_zh: '保養',
    domain: 'nails',
    items: [
      { key: 'basic', name_zh: '基本' },
      { key: 'deep', name_zh: '深層' },
    ],
  },
  {
    key: 'correction',
    name_zh: '矯正',
    domain: 'nails',
    items: [
      { key: 'nail_correction', name_zh: '指甲矯正' },
    ],
  },
]

// ── Lashes ───────────────────────────────────────────────────────

const LASHES_CATEGORIES: CategoryDef[] = [
  {
    key: 'new_set',
    name_zh: '嫁接',
    domain: 'lashes',
    items: [
      // 日式
      { key: 'jp_natural', name_zh: '自然', group_zh: '日式' },
      { key: 'jp_glam', name_zh: '妝感', group_zh: '日式' },
      { key: 'jp_dense', name_zh: '濃密', group_zh: '日式' },
      // 韓式
      { key: 'kr_natural', name_zh: '自然', group_zh: '韓式' },
      { key: 'kr_glam', name_zh: '妝感', group_zh: '韓式' },
      { key: 'kr_dense', name_zh: '濃密', group_zh: '韓式' },
      // 歐美
      { key: 'eu_natural', name_zh: '自然', group_zh: '歐美' },
      { key: 'eu_glam', name_zh: '妝感', group_zh: '歐美' },
      { key: 'eu_dense', name_zh: '濃密', group_zh: '歐美' },
      // 不確定
      { key: 'unsure_natural', name_zh: '自然', group_zh: '不確定' },
      { key: 'unsure_glam', name_zh: '妝感', group_zh: '不確定' },
      { key: 'unsure_dense', name_zh: '濃密', group_zh: '不確定' },
      // 新中式
      { key: 'cn_manga', name_zh: '漫畫', group_zh: '新中式' },
      { key: 'cn_fox', name_zh: '狐系', group_zh: '新中式' },
      { key: 'cn_butterfly', name_zh: '蝶系', group_zh: '新中式' },
      { key: 'cn_bunny', name_zh: '兔系', group_zh: '新中式' },
      { key: 'cn_tassel', name_zh: '流蘇', group_zh: '新中式' },
      { key: 'cn_sunflower', name_zh: '太陽花', group_zh: '新中式' },
      { key: 'cn_baby_curl', name_zh: '嬰兒彎', group_zh: '新中式' },
      // 泰式 (single row, no density)
      { key: 'thai', name_zh: '泰式' },
      // 純下睫毛 (single row, no density)
      { key: 'bottom_only', name_zh: '純下睫毛' },
    ],
  },
  {
    key: 'new_set_addon',
    name_zh: '嫁接加購',
    domain: 'lashes',
    items: [
      { key: 'addon_bottom', name_zh: '下睫毛' },
      { key: 'addon_brown', name_zh: '換咖啡色睫毛' },
      { key: 'addon_color', name_zh: '加彩色睫毛' },
    ],
  },
  {
    key: 'lash_removal',
    name_zh: '卸睫',
    domain: 'lashes',
    items: [
      { key: 'removal_refill', name_zh: '續接' },
      { key: 'removal_only', name_zh: '純卸睫' },
    ],
  },
  {
    key: 'lash_management',
    name_zh: '睫毛管理',
    domain: 'lashes',
    items: [
      { key: 'management_default', name_zh: '睫毛管理' },
    ],
  },
]

// ── Catalog ──────────────────────────────────────────────────────

export const SERVICE_CATALOG: Record<ServiceDomain, CategoryDef[]> = {
  nails: NAILS_CATEGORIES,
  lashes: LASHES_CATEGORIES,
  makeup: [], // no CSV data yet
}

// ── Helpers ──────────────────────────────────────────────────────

export function getCategoryDef(
  domain: ServiceDomain,
  categoryKey: string,
): CategoryDef | undefined {
  return SERVICE_CATALOG[domain].find(c => c.key === categoryKey)
}

export function getCatalogItem(
  domain: ServiceDomain,
  categoryKey: string,
  itemKey: string,
): CatalogItem | undefined {
  const cat = getCategoryDef(domain, categoryKey)
  return cat?.items.find(i => i.key === itemKey)
}
