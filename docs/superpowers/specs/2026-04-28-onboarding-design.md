# Onboarding Design — Splash → Login → Customer & Pro Flows

**Date:** 2026-04-28

---

## 1. Goal

Build the full onboarding flow from cold launch to a fully onboarded user (customer or pro), covering: splash screen, first-time intro slides, login (Google + Apple), customer profile setup, and pro application wizard.

---

## 2. Route Architecture

Use Expo Router groups with `<Redirect>` for auth gating. No dedicated auth-guard wrapper component — routing logic lives at the leaf screens and index.

```
app/
  index.tsx                  ← session check + redirect logic (splash)
  (auth)/
    _layout.tsx              ← stack layout, no tab bar
    intro.tsx                ← swipeable value slides (first-time only)
    login.tsx                ← Google + Apple sign-in
  (onboarding)/
    _layout.tsx              ← stack layout, progress indicator
    customer/
      name.tsx
      phone.tsx
      birthday.tsx
      gender.tsx
    pro/
      display-name.tsx
      domains.tsx
      nail-scope.tsx         ← conditional (shown only if 美甲 selected)
      location.tsx
      instagram.tsx
      id-photo.tsx
      submitted.tsx          ← "申請已送出" confirmation
  (tabs)/                    ← existing customer tabs
  (pro-tabs)/                ← existing pro tabs
```

**Auth gate logic in `app/index.tsx`:**

1. No session → redirect to `/(auth)/intro` (or `/(auth)/login` if intro already seen)
2. Session + `users.display_name IS NULL` → redirect to `/(onboarding)/customer/name`
3. Session + display_name set + no `pros` row → redirect to `/(tabs)/`
4. Session + `pros` row exists + `is_approved = false` → redirect to `/(onboarding)/pro/submitted`
5. Session + `pros.is_approved = true` → redirect to `/(pro-tabs)/`

**AsyncStorage key:** `@vava/introSeen` — set to `"true"` after the user passes the intro slides.

---

## 3. Screen Designs

### 3.1 Splash Screen

- Full-screen coral background (`#FF5A3C`)
- VAVA icon centered, rendered as outline-only SVG (stroke white, fill none)
- No interactive elements — shows briefly while session check runs, then redirects

### 3.2 Intro Slides (`/(auth)/intro`)

- 3 swipeable slides, dot pagination indicator
- Skip button (top right) + "開始" CTA on final slide
- On completion or skip: set `@vava/introSeen = "true"`, navigate to `/(auth)/login`

| Slide | Headline | Sub |
|-------|----------|-----|
| 1 | 即時預約 | 當天空位，立刻搶訂 |
| 2 | 精選美業師 | 頂尖美甲美睫設計師 |
| 3 | 安心付款 | 透明定價，無隱藏費用 |

### 3.3 Login Screen (`/(auth)/login`)

- Parchment background (`#FBFBF8`)
- VAVA logo/wordmark top-center
- Brief tagline
- Buttons pinned to bottom:
  - "以 Google 繼續" (white bg, Google icon)
  - "以 Apple 繼續" (black bg, Apple icon)
- Auth via Supabase `signInWithOAuth({ provider: 'google' | 'apple' })`
- After auth: redirect logic in `app/index.tsx` handles routing

### 3.4 Customer Onboarding (4 steps)

Each step is a focused, single-question screen. Progress shown via step indicator (1/4, 2/4…).

| Step | File | Question | Field |
|------|------|----------|-------|
| 1 | `customer/name.tsx` | 你希望我們怎麼稱呼你？ | `users.display_name` |
| 2 | `customer/phone.tsx` | 你的手機號碼？ | `users.phone` |
| 3 | `customer/birthday.tsx` | 你的生日？ | `users.birthday` (date) |
| 4 | `customer/gender.tsx` | 你的性別？ | `users.gender` (text) |

- Gender options: 女性 / 男性 / 其他 / 不想透露
- All fields saved to `users` table via UPSERT on each step (not batched at end)
- After step 4: redirect to `/(tabs)/`

### 3.5 Pro Apply Wizard (6 steps + confirmation)

| Step | File | Question | Field(s) |
|------|------|----------|----------|
| 1 | `pro/display-name.tsx` | 希望客戶怎麼稱呼你？ | `pros.display_name` |
| 2 | `pro/domains.tsx` | 你提供哪些服務？（可複選） | `pros.domains[]` — 美甲 / 美睫 / 美妝 |
| 3 | `pro/nail-scope.tsx` | 美甲服務範圍？（可複選，僅美甲顯示） | `pros.nail_scope[]` — 凝膠 / 手繪 / 光療 / 卸甲 |
| 4 | `pro/location.tsx` | 工作室地點 | `pros.studio_district` + `pros.studio_address` |
| 5 | `pro/instagram.tsx` | 連結 Instagram 工作帳號（可略過） | `pros.ig_handle` |
| 6 | `pro/id-photo.tsx` | 上傳身份證件 | `pros.id_photo_path` (Supabase Storage) |
| — | `pro/submitted.tsx` | "申請已送出，等待審核" | — |

- Step 3 (nail-scope) skipped automatically if 美甲 not in `domains`
- Step 5 (Instagram) has a "略過" skip button
- ID photo uploaded to Supabase Storage bucket `id-photos/{user_id}`; path stored in `pros.id_photo_path`
- On final submit: INSERT into `pros` table with `is_approved = false`
- Confirmation screen: "申請已送出" + "我們將在 1-2 個工作天內審核你的申請"
- Pro entry point: accessible from account settings ("申請成為設計師" button) — not shown during customer onboarding

---

## 4. Data Layer

### 4.1 Schema Migrations

```sql
-- users table additions
ALTER TABLE users ADD COLUMN birthday date;
ALTER TABLE users ADD COLUMN gender text;
-- gender values: 'female' | 'male' | 'other' | 'prefer_not'

-- pros table additions
ALTER TABLE pros ADD COLUMN domains text[] DEFAULT '{}';
ALTER TABLE pros ADD COLUMN nail_scope text[] DEFAULT '{}';
ALTER TABLE pros ADD COLUMN studio_district text;
ALTER TABLE pros ADD COLUMN studio_address text;
ALTER TABLE pros ADD COLUMN ig_handle text;
ALTER TABLE pros ADD COLUMN id_photo_path text;
```

Note: `pros.is_approved` (boolean) and `users.display_name` (text) already exist.

### 4.2 Auth Context Additions

The existing auth context should expose:

```ts
type AuthState = {
  session: Session | null
  user: User | null                          // users row
  pro: Pro | null                            // pros row (null if not a pro)
  onboardingComplete: boolean                // users.display_name IS NOT NULL
  proStatus: 'none' | 'pending' | 'approved' // derived from pros row
}
```

### 4.3 RLS Implications

- `users`: existing policy — users can read/update own row. `birthday` and `gender` columns inherit same policy.
- `pros`: existing insert/update policies cover new columns. No new policies needed.
- `id-photos` Storage bucket: RLS policy — authenticated users can insert to `id-photos/{user_id}/*` where `user_id = auth.uid()`. Admin role can read all.

---

## 5. Error & Edge Cases

| Scenario | Handling |
|----------|----------|
| OAuth fails | Show error toast, stay on login screen |
| Network loss mid-onboarding | Fields saved per step (UPSERT), user can re-enter from where they left off |
| ID photo upload fails | Show inline error, retry button |
| User backs out mid-wizard | Progress preserved in local state; `pros` row not written until final submit |
| Pro already pending re-enters app | Redirected to `submitted.tsx` confirmation screen |
| Intro seen flag missing (fresh install) | Default to showing intro |

---

## 6. Out of Scope

- Email/password auth (OAuth only for now)
- Pro approval admin dashboard (separate spec)
- Customer can become pro mid-session upgrade flow (post-MVP)
- Push notification opt-in during onboarding (post-MVP)
