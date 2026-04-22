# Account Page — Design Spec
Date: 2026-04-23

## Overview

Build the Account / Profile screen for the Vava customer app. The screen introduces two major features on top of the existing stub:

1. **Dual-role toggle** — users who hold both customer and pro roles can switch between them directly from this screen, changing the active tab bar experience.
2. **Liked Pros** — customers can save preferred designers from the results list and booking detail sheet, then quickly re-book them from their account page.

---

## 1. Screen Structure (3 Layers)

The screen is composed of three structurally independent layers rendered inside a single `position="relative"` container:

| Layer | Element | z-index |
|-------|---------|---------|
| 1 | Header (profile area) | 1 |
| 2 | Floating role toggle | 10 |
| 3 | Scrollable content | 1 |

These layers must **never** be collapsed into a single flat layout.

---

## 2. Header (Layer 1)

### Layout
- Single horizontal row: **avatar (left)** + **name + role label (centre-left)** + **notification icon (top-right)**
- Respects safe area inset at top
- Horizontal padding matches app-wide standard (16px)
- Bottom padding = `TOGGLE_HEIGHT / 2` to create physical space for the floating toggle overlap

### Content
| Element | Detail |
|---------|--------|
| Avatar | Circular, sourced from `session.user.user_metadata.avatar_url` if available, else initials placeholder |
| Username | `session.user.user_metadata.full_name` or phone/email fallback |
| Role label | Current active role in Chinese: `顧客` or `設計師` |
| Notification icon | Top-right, 44×44pt touch target. Taps → placeholder alert for now |

### Boundary
Header has a clearly defined bottom edge (background color or border). Content begins below.

---

## 3. Floating Role Toggle (Layer 3)

### Positioning
```
position: absolute
top:   HEADER_HEIGHT - (TOGGLE_HEIGHT / 2)
left:  16px
right: 16px
zIndex: 10
```
Straddles the header/content boundary. Approximately 50% of the toggle's height overlaps the header, 50% overlaps the content.

**Constants:**
- `TOGGLE_HEIGHT = 60` — fixed constant (height of the toggle card including padding)
- `HEADER_HEIGHT` — measured at runtime via `onLayout` on the header `YStack`, stored in a `useRef`. The toggle and scroll padding derive from this value once measured.

### Visibility
- **Only rendered** when `enabledRoles.length >= 2`
- Hidden for single-role users (customers without a pro account). No layout offset applied when hidden.

### Content
| Side | Element |
|------|---------|
| Left | Static label "Using Vava as" (small, muted) + current role name below (bold) |
| Right | React Native `Switch` component |

### Behavior
- Tapping the switch sets `activeRole` to the opposite role
- Role is persisted to AsyncStorage (`@vava/activeRole`)
- Switching role triggers a tab bar change (handled by the root layout listening to `activeRole`)
- No navigation stack reset — the switch updates state; the tab bar re-renders around the current stack

### Single-role fallback
When `enabledRoles.length === 1`:
- Toggle is not rendered
- Header `paddingBottom` reverts to standard value
- ScrollView `paddingTop` reverts to standard value
- Support section shows "成為設計師" entry

---

## 4. Scrollable Content (Layer 2)

### Top padding
`paddingTop = TOGGLE_HEIGHT / 2 + 8` — clears the overlapping portion of the floating toggle plus a small breathing gap.

### Sections

#### Section: 我的 Vava
| Row | Action |
|-----|--------|
| 預約紀錄 | Navigate to `/(tabs)/bookings` |
| 喜愛的設計師 | Navigate to `/account/liked-pros` (new screen) |

#### Section: 設定
| Row | Action |
|-----|--------|
| 帳號 | Shows email (and phone if present). Edit profile row rendered at 38% opacity, `disabled`, no interaction — placeholder for future |

#### Section: 支援
| Row | Condition | Action |
|-----|-----------|--------|
| 幫助中心 | Always | Open help URL in browser (placeholder alert for now) |
| 聯絡我們 | Always | Placeholder alert |
| 成為設計師 | Only when `enabledRoles` does NOT include `'pro'` | Navigate to pro onboarding flow (placeholder route `/pro/onboarding`) |

#### Standalone: 登出
- Full-width row below Support section
- Error Crimson `#b53333` text
- Tap triggers confirmation alert, then `signOut()`

---

## 5. Liked Pros Feature

### Data model

**Supabase table: `liked_pros`**
```sql
id          uuid primary key default gen_random_uuid()
customer_id uuid not null references auth.users(id) on delete cascade
pro_id      uuid not null references pros(id) on delete cascade
created_at  timestamptz default now()
unique(customer_id, pro_id)
```

**TypeScript type: `LikedPro`** (in `types/booking-list.ts` or new `types/liked-pros.ts`)
```ts
type LikedPro = {
  pro_id: string
  pro_display_name: string
  service_domain: 'nails' | 'lashes'
  profile_photo_url: string | null
}
```

### API (`lib/liked-pros-api.ts`)
| Function | Method | Description |
|----------|--------|-------------|
| `fetchLikedPros()` | GET | Returns `LikedPro[]` for the current user |
| `likePro(proId)` | POST | Insert into `liked_pros` |
| `unlikePro(proId)` | DELETE | Remove from `liked_pros` |
| `isProLiked(proId)` | — | Derived from cached list |

### Entry points for liking a pro

1. **Results screen** (`app/book/results.tsx`) — heart icon button on each pro card in the bottom sheet list. Toggled state, optimistic update.
2. **Booking detail sheet** (`components/booking/BookingDetailSheet.tsx`) — heart/save icon in the header row. Same optimistic toggle.

### Liked Pros screen (`app/account/liked-pros.tsx`)

- Back navigation to Account page
- List of `LikedPro` items, each showing:
  - Circular avatar (`profile_photo_url` or initials)
  - `pro_display_name`
  - `service_domain` label (美甲師 / 美睫師)
  - "預約" button (dark pill)
- Tapping "預約": opens a bottom sheet with pro name + photo → navigates to slots screen with pro pre-selected. Before navigating, dispatch `SET_CATEGORY` and `SET_PRO` actions on the booking context so the slots screen has the correct pro pre-loaded.
- Empty state: "還沒有喜愛的設計師" with a CTA to start browsing

---

## 6. Role-Based State Management

### Data model
```ts
type UserRole = 'customer' | 'pro'

type RoleState = {
  enabledRoles: UserRole[]   // derived from DB: has pros record → includes 'pro'
  activeRole: UserRole       // persisted in AsyncStorage
}
```

### Role detection
On app load, check if the authenticated user has a record in the `pros` table:
- Yes → `enabledRoles = ['customer', 'pro']`
- No → `enabledRoles = ['customer']`

### Persistence
`activeRole` is persisted via AsyncStorage key `@vava/activeRole`. On cold start, load persisted value; fall back to `'customer'`.

### Role context (`lib/role-context.tsx`)
Provides `{ enabledRoles, activeRole, setActiveRole }` to the tree. Tab layout listens to `activeRole` and renders the appropriate tab set.

### Tab bar behaviour
| activeRole | Tab bar |
|------------|---------|
| `customer` | Home · Bookings · Account |
| `pro` | (Pro dashboard tabs — defined in future pro spec) |

Switching role does **not** reset the navigation stack. The tab bar re-renders; current screen stack is preserved where compatible.

---

## 7. Edge Cases

| Case | Handling |
|------|----------|
| Single-role user | Toggle hidden, no layout offset, "成為設計師" shown in Support |
| Pro switches to customer mid-session | `activeRole` updates, tab bar changes, no stack reset |
| User switches role from deep in navigation | Role update propagates via context; tab bar updates on next render |
| No liked pros | Empty state on liked-pros screen with browse CTA |
| Pro account not yet approved | Treat as single-role user until `is_approved = true` |
| `profile_photo_url` null | Render initials avatar using first character of display name |

---

## 8. Out of Scope (this spec)

- Pro dashboard tab bar content (separate spec)
- Notification center (bell icon is placeholder)
- Edit profile (disabled placeholder)
- Help Center and Contact Us real destinations
- Pro onboarding flow (just a placeholder route)
- Push notification preferences

---

## 9. New Files

| File | Purpose |
|------|---------|
| `app/(tabs)/account.tsx` | Rewrite of existing stub |
| `app/account/_layout.tsx` | Stack layout for account sub-screens |
| `app/account/liked-pros.tsx` | Liked pros list screen |
| `lib/role-context.tsx` | RoleState context + provider |
| `lib/liked-pros-api.ts` | fetchLikedPros / likePro / unlikePro |
| `types/liked-pros.ts` | LikedPro type |
| `components/account/ProfileHeader.tsx` | Header layer component |
| `components/account/RoleToggle.tsx` | Floating toggle component |
| `components/account/SettingsRow.tsx` | Reusable settings list row |
| `components/account/LikedProCard.tsx` | Row in liked pros list |
| `components/account/LikedProSheet.tsx` | Bottom sheet on liked pro tap |
| `components/HeartButton.tsx` | Heart toggle used in results + booking detail |

### Modified files
| File | Change |
|------|--------|
| `app/_layout.tsx` | Wrap with `RoleProvider` |
| `app/(tabs)/_layout.tsx` | Listen to `activeRole`, switch tab sets |
| `app/book/results.tsx` | Add `HeartButton` to pro cards |
| `components/booking/BookingDetailSheet.tsx` | Add `HeartButton` to header |
| `supabase/migrations/` | New migration for `liked_pros` table |
