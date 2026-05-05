# Pro Services (服務項目) Rebuild — Design Spec

**Date:** 2026-04-27

## Overview

Rebuild the pro services page to use predefined service categories from a seed catalog, grouped by domain (美甲/美睫) in a single scrollable list. Each priceable row = one category+style combination with duration and price set by the pro.

## Data Model

### Seed Catalog (`constants/service-catalog.ts`)

Single source of truth for all predefined service categories and styles.

```typescript
type ServiceDomain = 'nails' | 'lashes'

type StyleDef = {
  key: string
  name_zh: string
  name_en: string
}

type CategoryDef = {
  key: string
  name_zh: string
  name_en: string
  domain: ServiceDomain
  has_styles: boolean
  skips_style: boolean
  is_standalone: boolean
  is_addon: boolean
  styles: StyleDef[]  // empty if has_styles === false
}

// Nails categories
// - gel (凝膠): has_styles=true, styles=placeholder TBD
// - nail_removal (卸甲): skips_style, standalone+addon
// - extension (延甲): skips_style, addon only (requires gel or repair)
// - repair (修補): skips_style, standalone
// - treatment (保養): skips_style, standalone
//
// Lashes categories
// - new_set (嫁接): has_styles=true, styles=placeholder TBD
// - fill_in (補睫): has_styles=true, styles=placeholder TBD
// - lash_removal (卸睫): skips_style, standalone+addon
// - lash_management (睫毛管理): skips_style, standalone
// - bottom_lashes (下睫毛): skips_style, standalone+addon
```

### Updated ServiceItem (`types/pro.ts`)

```typescript
export type ServiceItem = {
  id: string
  domain: ServiceDomain
  category_key: string    // references CategoryDef.key
  style_key: string | null // references StyleDef.key, null if skips_style
  duration_minutes: number
  price: number
}
```

### API (`lib/pro-services-api.ts`)

- `fetchProServices()` → mock data, `USE_MOCK` pattern
- `saveProService(item)` → stub
- `deleteProService(id)` → stub

## Page Layout

### Header
- Pattern B (pro sub-page): back icon (size=16, press opacity) + left-aligned title "服務項目" (fontSize=18, fontWeight=700)
- "+" button top-right to add new service

### List
- Single scrollable list (no tabs)
- **Domain sections**: 美甲 and 美睫 as section headers (fontSize=18, fontWeight=700, paddingHorizontal=20, paddingTop=24, paddingBottom=10 — same as account section headers)
- **Category sub-headers**: category name (fontSize=15, fontWeight=600, color=#1F2723, paddingHorizontal=20)
- **Style rows** under each category: show style name + duration + price
- **No-style rows**: single row for the category with duration + price
- Each row has edit tap target (pen icon)
- Dividers between rows: 1px #E8E9E9, marginHorizontal=16

### Add Flow
1. Tap "+" → modal sheet opens
2. Pick domain (美甲 / 美睫) — two selection chips
3. Pick category from that domain's catalog (filtered to what pro hasn't added yet)
4. If category `has_styles`: show style picker (multi-select which styles they offer)
5. Set duration + price per priceable row
6. Save

### Edit Flow
- Tap row → modal sheet with duration + price fields pre-filled
- Delete button at bottom (destructive, with confirmation alert)

### Empty State
- Icon: `serviceGeneric` (size=48, color=#E8E9E9)
- Text: "尚未新增服務項目" (fontSize=16, fontWeight=600, color=#626765)
- CTA button: "新增服務" (primary dark button)

## Mock Data

```typescript
// Example pro who does gel nails (2 styles) + nail removal + new set lashes (2 styles)
const MOCK_SERVICES: ServiceItem[] = [
  { id: 's-1', domain: 'nails', category_key: 'gel', style_key: 'solid', duration_minutes: 90, price: 800 },
  { id: 's-2', domain: 'nails', category_key: 'gel', style_key: 'french', duration_minutes: 120, price: 1000 },
  { id: 's-3', domain: 'nails', category_key: 'nail_removal', style_key: null, duration_minutes: 30, price: 300 },
  { id: 's-4', domain: 'lashes', category_key: 'new_set', style_key: 'natural', duration_minutes: 90, price: 1200 },
  { id: 's-5', domain: 'lashes', category_key: 'new_set', style_key: 'dramatic', duration_minutes: 120, price: 1500 },
]
```

## Files

| Action | Path | Purpose |
|--------|------|---------|
| Create | `constants/service-catalog.ts` | Seed catalog: domains → categories → styles |
| Update | `types/pro.ts` | Add domain, category_key, style_key to ServiceItem |
| Create | `lib/pro-services-api.ts` | Mock fetch/save/delete with USE_MOCK |
| Rewrite | `app/pro/services.tsx` | Rebuilt page with grouped list + add/edit sheets |

## Out of Scope
- Style names (placeholder until user provides)
- Addon dependency enforcement (延甲 requires 凝膠/修補) — booking flow concern
- hand/foot scope (nail_scope) — lives on pro profile, not services
