# Pro Account Sub-pages Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 4 real sub-pages off the Pro account screen, replacing the "即將推出" stubs. Also add a new 營業基本資料 row to the 營業設定 section.

---

## Scope

| Route | Screen | Section in account |
|---|---|---|
| `/pro/booking-settings` | 預約設定 | 營業設定 |
| `/pro/business-info` | 營業基本資料 | 營業設定 (new row) |
| `/pro/profile` | 個人資料 | 帳號 |
| `/pro/notifications` | 通知設定 | 帳號 |

休假設定 is out of scope for this sprint.

---

## Shared Pattern

All sub-pages follow the same shell as `/pro/services`:
- `useSafeAreaInsets` for top padding
- Header: `‹` back button (`router.back()`) + title + optional right action (`儲存`)
- `ScrollView` body with `paddingBottom: insets.bottom + 40`
- Background `#FBFBF8`, section cards `#F5F5F0`, dividers `#e8e6dc`
- All data is mock (static constants) — no Supabase queries

---

## Screen 1: 預約設定 (`/pro/booking-settings`)

**Header:** 預約設定 | 儲存 (right, terracotta, tapping shows Alert "已儲存")

**Section 1 — 預約規則** (`form-group` card):

| Row | Value type | Default |
|---|---|---|
| 最早提前預約 | picker: 1小時 / 2小時 / 4小時 / 24小時 | 1小時 |
| 最多提前預約 | picker: 7天 / 14天 / 30天 / 60天 | 30天 |
| 服務間隔時間 | picker: 0 / 15 / 30 / 60 分鐘 | 15分鐘 |

Each row: label (flex 1) + current value (grey) + chevron `›`. Tapping shows an `ActionSheet`/`Alert` with the options listed above.

**Section 2 — 確認方式** (`form-group` card):

| Row | Value type | Default |
|---|---|---|
| 自動確認預約 | Switch | on |
| 取消截止時間 | picker: 1小時前 / 4小時前 / 24小時前 / 48小時前 | 24小時前 |

Switch uses RN `Switch` component (terracotta `#c96442` when on). Cancellation row: same chevron pattern.

All state is local `useState` — no persistence in MVP.

---

## Screen 2: 營業基本資料 (`/pro/business-info`)

**Header:** 營業基本資料 | 儲存

**Section 1 — 營業地址**

Single `TextInput` in a `#F5F5F0` rounded card. Placeholder: `請輸入營業地址`. Default value: `台北市大安區忠孝東路四段`.

**Section 2 — 營業時間**

Seven rows, one per weekday (週一–週日). Each row:
- Left: weekday label
- Right: time range string (e.g. `11:00 – 20:00`) OR `休息` in terracotta if closed

Default state: Mon–Sat open 11:00–20:00, Sun closed.

Tapping a day shows an `Alert` with options: `開放` / `休息` (MVP — no time picker needed yet).

All state is local `useState`.

---

## Screen 3: 個人資料 (`/pro/profile`)

**Header:** 個人資料 | 儲存

**Photo row** (above the form groups, below header):
- 44×44 avatar circle (same deterministic palette as `ProfileHeader`)
- Tapping shows Alert "更換大頭照 — 即將推出"

**Section 1 — 基本資訊**

| Row | Input | Placeholder |
|---|---|---|
| 顯示名稱 | TextInput (single line) | 請輸入顯示名稱 |
| 簡介 | TextInput (multiline, 3 lines) | 介紹自己和你的服務風格 |

**Section 2 — 聯絡方式**

| Row | Input | Placeholder |
|---|---|---|
| 電話 | TextInput, keyboardType phone-pad | 09XX-XXX-XXX |
| Instagram | TextInput | @yourhandle |
| Line ID | TextInput | your_line_id |

Each row: label on left, `TextInput` on right (right-aligned, grey placeholder). No inline editing — tapping focuses the field in-place.

All state is local `useState` initialised from mock defaults.

---

## Screen 4: 通知設定 (`/pro/notifications`)

**Header:** 通知設定 (no 儲存 — changes apply immediately via toggle)

**Push permission check:**

Use `expo-notifications` `getPermissionsAsync()` on mount to check permission status.

**State A — push OFF:**
Full-screen centred card (`#F5F5F0`, `borderRadius: 12`):
- Bell icon (FA6ProIcon `bell`, regular, 28px, `#858279`)
- Title: `推播通知已關閉` (16px/700)
- Body: `開啟後，即可收到新預約、取消及提醒通知` (13px, `#858279`, centred)
- Button: `前往開啟通知 →` (dark filled, `borderRadius: 10`) → calls `Linking.openSettings()`

**State B — push ON:**
Single `#F5F5F0` card with 3 toggle rows:

| Row | Default |
|---|---|
| 新預約 | on |
| 取消通知 | on |
| 服務提醒 | off |

Each row: label (flex 1) + RN `Switch` (terracotta when on). State is local `useState`.

---

## Account Screen Changes

Modify `app/(pro-tabs)/account.tsx`:

1. **Add row** in 營業設定 section (after 預約設定, before 休假設定 which is removed):
   ```
   <SettingsRow label="營業基本資料" iconName="store" onPress={() => router.push('/pro/business-info')} />
   ```
2. **Remove** 休假設定 row entirely.
3. **Wire** 預約設定 → `router.push('/pro/booking-settings')`
4. **Wire** 個人資料 → `router.push('/pro/profile')`
5. **Wire** 通知設定 → `router.push('/pro/notifications')`

---

## File Changes

- **Modify:** `app/(pro-tabs)/account.tsx` — wire routes, add 營業基本資料 row, remove 休假設定
- **Create:** `app/pro/booking-settings.tsx`
- **Create:** `app/pro/business-info.tsx`
- **Create:** `app/pro/profile.tsx`
- **Create:** `app/pro/notifications.tsx`
- **Modify:** `components/FA6ProIcon.tsx` — add `store` codepoint if missing

---

## Out of Scope

- Supabase persistence (all state is local mock)
- Real push notification subscription logic
- Time picker for 營業時間 (Alert options only)
- Profile photo upload
- Form validation beyond basic placeholder text
