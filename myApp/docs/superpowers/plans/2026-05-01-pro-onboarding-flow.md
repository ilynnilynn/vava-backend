# Pro Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the pro onboarding flow with Taiwan city/district dropdowns + Google Places address autocomplete, Instagram deep-link verify, and an exit button on every step.

**Architecture:** Four targeted file changes + one new data constant. The `OnboardingStepLayout` shell gets an X exit button. The location screen replaces plain text inputs with a city picker modal, district picker modal, and Google Places autocomplete. The instagram screen adds a deep-link verify step. No DB schema changes — `studio_district` stores "城市 行政區" (e.g. "台北市 大安區") combined.

**Tech Stack:** React Native, Expo, Tamagui, `react-native-google-places-autocomplete`, `expo-linking`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `components/onboarding/OnboardingStepLayout.tsx` | Add X exit button top-right |
| Create | `constants/taiwan-districts.ts` | Static city → districts lookup |
| Modify | `app/(onboarding)/pro/location.tsx` | City/district pickers + Google Places |
| Modify | `app/(onboarding)/pro/instagram.tsx` | Deep-link verify flow |

---

## Task 1: Exit button on OnboardingStepLayout

**Files:**
- Modify: `components/onboarding/OnboardingStepLayout.tsx`

- [ ] **Step 1: Replace empty headerRight placeholder with X button**

Replace the full file content:

```tsx
// components/onboarding/OnboardingStepLayout.tsx
import { type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { ProgressBar } from '@/components/booking/ProgressBar'

type Props = {
  title: string
  subtitle?: string
  step: number
  totalSteps: number
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  onSkip?: () => void
  children: ReactNode
}

export function OnboardingStepLayout({
  title,
  subtitle,
  step,
  totalSteps,
  onNext,
  nextLabel = '下一步',
  nextDisabled = false,
  onSkip,
  children,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: back + progress + exit */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <ProgressBar currentStep={step} totalSteps={totalSteps} />
        <Pressable
          onPress={() => router.replace('/(tabs)/account' as never)}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="離開申請"
        >
          <AppIcon name="close" size={20} color="#626765" />
        </Pressable>
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text fontSize={30} fontWeight="600" lineHeight={38} color="#1F2723">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize={15} lineHeight={22} color="#626765" marginTop={8}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Bottom CTA */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        {onSkip ? (
          <Pressable onPress={onSkip} accessibilityRole="button" style={styles.skipLink}>
            <Text fontSize={15} color="#626765">略過</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onNext}
          disabled={nextDisabled}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          style={({ pressed }) => [
            styles.nextBtn,
            { opacity: nextDisabled ? 0.4 : pressed ? 0.75 : 1 },
          ]}
        >
          <Text fontSize={16} fontWeight="600" color="#FBFBF8">{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBF8' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  content: { flex: 1, paddingHorizontal: 20 },
  cta: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  skipLink: { alignItems: 'center', paddingVertical: 4 },
  nextBtn: {
    height: 52,
    backgroundColor: '#FF5A3C',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 2: Verify visually** — open any onboarding step in simulator. You should see a `×` icon top-right. Tapping it should land on the Account tab.

- [ ] **Step 3: Commit**

```bash
cd myApp
git add components/onboarding/OnboardingStepLayout.tsx
git commit -m "feat: add exit button to pro onboarding layout"
```

---

## Task 2: Taiwan city/district data

**Files:**
- Create: `constants/taiwan-districts.ts`

- [ ] **Step 1: Create the file**

```ts
// constants/taiwan-districts.ts
export type TaiwanCity = {
  name: string
  districts: string[]
}

export const TAIWAN_CITIES: TaiwanCity[] = [
  {
    name: '台北市',
    districts: ['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區'],
  },
  {
    name: '新北市',
    districts: ['板橋區','新莊區','中和區','永和區','土城區','樹林區','三重區','蘆洲區','新店區','汐止區','淡水區','三峽區','瑞芳區','林口區','深坑區','石碇區','坪林區','三芝區','石門區','八里區','平溪區','雙溪區','貢寮區','金山區','萬里區','烏來區'],
  },
  {
    name: '桃園市',
    districts: ['桃園區','中壢區','大溪區','楊梅區','蘆竹區','大園區','龜山區','八德區','龍潭區','平鎮區','新屋區','觀音區','復興區'],
  },
  {
    name: '台中市',
    districts: ['中區','東區','南區','西區','北區','西屯區','南屯區','北屯區','豐原區','東勢區','大甲區','清水區','沙鹿區','梧棲區','后里區','神岡區','潭子區','大雅區','新社區','石岡區','外埔區','大安區','烏日區','大肚區','龍井區','霧峰區','太平區','大里區','和平區'],
  },
  {
    name: '台南市',
    districts: ['中西區','東區','南區','北區','安平區','安南區','永康區','歸仁區','新化區','左鎮區','玉井區','楠西區','南化區','仁德區','關廟區','龍崎區','官田區','麻豆區','佳里區','西港區','七股區','將軍區','學甲區','北門區','新營區','後壁區','白河區','東山區','六甲區','下營區','柳營區','鹽水區','善化區','大內區','山上區','新市區','安定區'],
  },
  {
    name: '高雄市',
    districts: ['楠梓區','左營區','鼓山區','三民區','鹽埕區','前金區','苓雅區','前鎮區','旗津區','小港區','鳳山區','大寮區','鳥松區','林園區','仁武區','大社區','岡山區','路竹區','橋頭區','梓官區','茄萣區','永安區','湖內區','田寮區','阿蓮區','燕巢區','彌陀區','旗山區','美濃區','六龜區','甲仙區','杉林區','內門區','茂林區','桃源區','那瑪夏區'],
  },
  {
    name: '基隆市',
    districts: ['仁愛區','信義區','中正區','中山區','安樂區','暖暖區','七堵區'],
  },
  {
    name: '新竹市',
    districts: ['東區','北區','香山區'],
  },
  {
    name: '嘉義市',
    districts: ['東區','西區'],
  },
  {
    name: '新竹縣',
    districts: ['竹北市','竹東鎮','新埔鎮','關西鎮','湖口鄉','新豐鄉','芎林鄉','橫山鄉','北埔鄉','寶山鄉','峨眉鄉','尖石鄉','五峰鄉'],
  },
  {
    name: '苗栗縣',
    districts: ['苗栗市','通霄鎮','苑裡鎮','竹南鎮','頭份市','後龍鎮','卓蘭鎮','大湖鄉','公館鄉','銅鑼鄉','南庄鄉','頭屋鄉','三義鄉','西湖鄉','造橋鄉','三灣鄉','獅潭鄉','泰安鄉'],
  },
  {
    name: '彰化縣',
    districts: ['彰化市','鹿港鎮','和美鎮','線西鄉','伸港鄉','福興鄉','秀水鄉','花壇鄉','芬園鄉','員林市','溪湖鎮','田中鎮','大村鄉','埔鹽鄉','埔心鄉','永靖鄉','社頭鄉','二水鄉','北斗鎮','二林鎮','田尾鄉','埤頭鄉','芳苑鄉','大城鄉','竹塘鄉','溪州鄉'],
  },
  {
    name: '南投縣',
    districts: ['南投市','中寮鄉','草屯鎮','國姓鄉','埔里鎮','仁愛鄉','名間鄉','集集鎮','水里鄉','魚池鄉','信義鄉','竹山鎮','鹿谷鄉'],
  },
  {
    name: '雲林縣',
    districts: ['斗六市','斗南鎮','虎尾鎮','西螺鎮','土庫鎮','北港鎮','古坑鄉','大埤鄉','莿桐鄉','林內鄉','二崙鄉','崙背鄉','麥寮鄉','東勢鄉','褒忠鄉','台西鄉','元長鄉','四湖鄉','口湖鄉','水林鄉'],
  },
  {
    name: '嘉義縣',
    districts: ['太保市','朴子市','布袋鎮','大林鎮','民雄鄉','溪口鄉','新港鄉','六腳鄉','東石鄉','義竹鄉','鹿草鄉','水上鄉','中埔鄉','竹崎鄉','梅山鄉','番路鄉','大埔鄉','阿里山鄉'],
  },
  {
    name: '屏東縣',
    districts: ['屏東市','潮州鎮','東港鎮','恆春鎮','萬丹鄉','長治鄉','麟洛鄉','九如鄉','里港鄉','鹽埕鄉','高樹鄉','萬巒鄉','內埔鄉','竹田鄉','新埤鄉','枋寮鄉','新園鄉','崁頂鄉','林邊鄉','南州鄉','佳冬鄉','琉球鄉','車城鄉','滿州鄉','枋山鄉','三地門鄉','霧台鄉','瑪家鄉','泰武鄉','來義鄉','春日鄉','獅子鄉','牡丹鄉'],
  },
  {
    name: '宜蘭縣',
    districts: ['宜蘭市','羅東鎮','蘇澳鎮','頭城鎮','礁溪鄉','壯圍鄉','員山鄉','冬山鄉','五結鄉','三星鄉','大同鄉','南澳鄉'],
  },
  {
    name: '花蓮縣',
    districts: ['花蓮市','鳳林鎮','玉里鎮','新城鄉','吉安鄉','壽豐鄉','光復鄉','豐濱鄉','瑞穗鄉','富里鄉','秀林鄉','萬榮鄉','卓溪鄉'],
  },
  {
    name: '台東縣',
    districts: ['台東市','成功鎮','關山鎮','卑南鄉','鹿野鄉','池上鄉','東河鄉','長濱鄉','太麻里鄉','大武鄉','綠島鄉','海端鄉','延平鄉','金峰鄉','達仁鄉','蘭嶼鄉'],
  },
  {
    name: '澎湖縣',
    districts: ['馬公市','湖西鄉','白沙鄉','西嶼鄉','望安鄉','七美鄉'],
  },
  {
    name: '金門縣',
    districts: ['金城鎮','金湖鎮','金沙鎮','金寧鄉','烈嶼鄉','烏坵鄉'],
  },
  {
    name: '連江縣',
    districts: ['南竿鄉','北竿鄉','莒光鄉','東引鄉'],
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add constants/taiwan-districts.ts
git commit -m "feat: add Taiwan city/district static data"
```

---

## Task 3: Install Google Places package

**Files:**
- Modify: `package.json` (via install)

- [ ] **Step 1: Install the package**

```bash
cd myApp
npm install react-native-google-places-autocomplete
```

Expected: package added to `node_modules` with no errors.

- [ ] **Step 2: Add the API key to your environment**

In `myApp/.env.local` (create if it doesn't exist), add:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

The key must have **Places API** enabled in Google Cloud Console (same project as your existing Google Sign-In). Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Enable APIs → search "Places API" → Enable.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install react-native-google-places-autocomplete"
```

---

## Task 4: Location screen — city/district dropdowns + Google Places

**Files:**
- Modify: `app/(onboarding)/pro/location.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
// app/(onboarding)/pro/location.tsx
import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import GooglePlacesAutocomplete from 'react-native-google-places-autocomplete'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'
import { TAIWAN_CITIES, type TaiwanCity } from '@/constants/taiwan-districts'

const DRAFT_KEY = '@vava/proWizardDraft'
const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

export default function ProLocationScreen() {
  const router = useRouter()
  const [city, setCity] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [showDistrictPicker, setShowDistrictPicker] = useState(false)

  const cityData: TaiwanCity | undefined = TAIWAN_CITIES.find((c) => c.name === city)
  const canNext = !!city && !!district && address.trim().length > 0

  async function handleNext() {
    if (!canNext) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...current,
      studio_district: `${city} ${district}`,
      studio_address: address.trim(),
    }))
    router.push('/(onboarding)/pro/display-name' as never)
  }

  function selectCity(name: string) {
    setCity(name)
    setDistrict(null)   // reset district when city changes
    setShowCityPicker(false)
  }

  function selectDistrict(name: string) {
    setDistrict(name)
    setShowDistrictPicker(false)
  }

  return (
    <OnboardingStepLayout
      title="工作室地點"
      step={3}
      totalSteps={6}
      onNext={handleNext}
      nextDisabled={!canNext}
    >
      {/* City picker trigger */}
      <Text style={styles.label}>城市</Text>
      <Pressable
        onPress={() => setShowCityPicker(true)}
        style={[styles.selector, city ? styles.selectorFilled : null]}
        accessibilityRole="button"
        accessibilityLabel="選擇城市"
      >
        <Text style={[styles.selectorText, !city && styles.placeholder]}>
          {city ?? '選擇城市'}
        </Text>
        <AppIcon name="chevronDown" size={16} color="#626765" />
      </Pressable>

      {/* District picker trigger */}
      <Text style={[styles.label, styles.labelSpaced]}>行政區</Text>
      <Pressable
        onPress={() => city ? setShowDistrictPicker(true) : undefined}
        style={[styles.selector, district ? styles.selectorFilled : null, !city && styles.selectorDisabled]}
        accessibilityRole="button"
        accessibilityLabel="選擇行政區"
      >
        <Text style={[styles.selectorText, !district && styles.placeholder]}>
          {district ?? '選擇行政區'}
        </Text>
        <AppIcon name="chevronDown" size={16} color={city ? '#626765' : '#C8C9C8'} />
      </Pressable>

      {/* Google Places address input */}
      <Text style={[styles.label, styles.labelSpaced]}>詳細地址</Text>
      <GooglePlacesAutocomplete
        placeholder="輸入地址"
        onPress={(data) => setAddress(data.description)}
        query={{
          key: MAPS_KEY,
          language: 'zh-TW',
          components: 'country:tw',
        }}
        textInputProps={{
          placeholderTextColor: '#AEADA6',
          onChangeText: (text) => { if (!text) setAddress('') },
        }}
        styles={{
          textInput: styles.addressInput,
          row: styles.suggestionRow,
          description: styles.suggestionText,
          listView: styles.suggestionList,
        }}
        fetchDetails={false}
        enablePoweredByContainer={false}
        keepResultsAfterBlur={false}
        minLength={2}
      />

      {/* City picker modal */}
      <Modal visible={showCityPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCityPicker(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>選擇城市</Text>
            <Pressable onPress={() => setShowCityPicker(false)} style={styles.modalClose}>
              <AppIcon name="close" size={20} color="#626765" />
            </Pressable>
          </View>
          <FlatList
            data={TAIWAN_CITIES}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selectCity(item.name)}
                style={[styles.modalRow, city === item.name && styles.modalRowSelected]}
              >
                <Text style={[styles.modalRowText, city === item.name && styles.modalRowTextSelected]}>
                  {item.name}
                </Text>
                {city === item.name && <AppIcon name="check" size={16} color="#FF5A3C" />}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>

      {/* District picker modal */}
      <Modal visible={showDistrictPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDistrictPicker(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>選擇行政區</Text>
            <Pressable onPress={() => setShowDistrictPicker(false)} style={styles.modalClose}>
              <AppIcon name="close" size={20} color="#626765" />
            </Pressable>
          </View>
          <FlatList
            data={cityData?.districts ?? []}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => selectDistrict(item)}
                style={[styles.modalRow, district === item && styles.modalRowSelected]}
              >
                <Text style={[styles.modalRowText, district === item && styles.modalRowTextSelected]}>
                  {item}
                </Text>
                {district === item && <AppIcon name="check" size={16} color="#FF5A3C" />}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#626765', marginBottom: 8 },
  labelSpaced: { marginTop: 20 },
  selector: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBFBF8',
  },
  selectorFilled: { borderColor: '#1F2723' },
  selectorDisabled: { backgroundColor: '#F6F4EF', opacity: 0.5 },
  selectorText: { fontSize: 16, color: '#1F2723' },
  placeholder: { color: '#AEADA6' },
  addressInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1F2723',
    backgroundColor: '#FBFBF8',
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: '#E8E9E9',
    borderRadius: 10,
    marginTop: 4,
  },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 12 },
  suggestionText: { fontSize: 14, color: '#1F2723' },
  modal: { flex: 1, backgroundColor: '#FBFBF8' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9E9',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2723' },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalRowSelected: { backgroundColor: '#FFF5F3' },
  modalRowText: { fontSize: 16, color: '#1F2723' },
  modalRowTextSelected: { fontWeight: '600', color: '#FF5A3C' },
  separator: { height: 1, backgroundColor: '#E8E9E9', marginHorizontal: 20 },
})
```

- [ ] **Step 2: Check that `AppIcon` has `chevronDown` and `check` names**

Run:
```bash
grep -n 'chevronDown\|check' myApp/constants/iconMap.ts | head -10
```

If `chevronDown` is missing, substitute `forward` rotated or use `AppIcon name="chevronRight"` rotated — or just use a Unicode `›` text character. If `check` is missing, use `AppIcon name="rating"` or a `✓` Text node.

Adapt the JSX to use icon names that exist in `constants/iconMap.ts`.

- [ ] **Step 3: Test in simulator**

Open the pro onboarding flow. On step 3:
- Tap 城市 → modal opens with all 22 Taiwan cities.
- Select one → modal closes, city shows.
- Tap 行政區 → modal opens with filtered districts.
- Select one → closes.
- Type in 詳細地址 → Google Places suggestions appear.
- Select a suggestion → field populates.
- Next button becomes enabled.

- [ ] **Step 4: Commit**

```bash
git add app/\(onboarding\)/pro/location.tsx
git commit -m "feat: Taiwan city/district pickers + Google Places address on location step"
```

---

## Task 5: Instagram screen — deep-link verify flow

**Files:**
- Modify: `app/(onboarding)/pro/instagram.tsx`

- [ ] **Step 1: Replace the full file**

```tsx
// app/(onboarding)/pro/instagram.tsx
import { useState } from 'react'
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProInstagramScreen() {
  const router = useRouter()
  const [handle, setHandle] = useState('')
  const [verified, setVerified] = useState(false)

  const trimmedHandle = handle.trim().replace(/^@/, '')
  const hasHandle = trimmedHandle.length > 0

  async function openInstagram() {
    // Try the Instagram app deep link first; fall back to web URL
    const appUrl = `instagram://user?username=${trimmedHandle}`
    const webUrl = `https://www.instagram.com/${trimmedHandle}/`
    const canOpen = await Linking.canOpenURL(appUrl)
    await Linking.openURL(canOpen ? appUrl : webUrl)
  }

  async function saveAndNext(value: string | null) {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    const patch = value ? { ig_handle: value } : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, ...patch }))
    router.push('/(onboarding)/pro/id-photo' as never)
  }

  return (
    <OnboardingStepLayout
      title="連結 Instagram 工作帳號"
      subtitle="讓客人看到你的作品（可略過）"
      step={5}
      totalSteps={6}
      onNext={() => saveAndNext(verified ? trimmedHandle : null)}
      onSkip={() => saveAndNext(null)}
      nextDisabled={hasHandle && !verified}
    >
      {/* Handle input */}
      <View style={styles.inputRow}>
        <Text style={styles.atSign}>@</Text>
        <TextInput
          value={handle}
          onChangeText={(t) => { setHandle(t); setVerified(false) }}
          placeholder="your_account"
          placeholderTextColor="#AEADA6"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          style={styles.input}
        />
      </View>

      {/* Open Instagram button — appears once handle is typed */}
      {hasHandle && !verified && (
        <Pressable
          onPress={openInstagram}
          style={({ pressed }) => [styles.verifyBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <AppIcon name="forward" size={14} color="#FF5A3C" />
          <Text style={styles.verifyBtnText}>前往 Instagram 確認</Text>
        </Pressable>
      )}

      {/* Confirm button — appears after user has opened Instagram */}
      {hasHandle && !verified && (
        <Pressable
          onPress={() => setVerified(true)}
          style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.75 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.confirmBtnText}>✓ 確認是我的帳號</Text>
        </Pressable>
      )}

      {/* Verified state */}
      {verified && (
        <View style={styles.verifiedRow}>
          <AppIcon name="check" size={16} color="#33CC87" />
          <Text style={styles.verifiedText}>@{trimmedHandle} 已連結</Text>
        </View>
      )}
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E8E9E9',
    paddingVertical: 4,
    marginBottom: 20,
  },
  atSign: { fontSize: 20, color: '#AEADA6', marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 20,
    color: '#1F2723',
    paddingVertical: 8,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF5A3C',
    borderRadius: 9999,
    height: 44,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  verifyBtnText: { fontSize: 15, fontWeight: '600', color: '#FF5A3C' },
  confirmBtn: {
    backgroundColor: '#F6F4EF',
    borderRadius: 9999,
    height: 44,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontSize: 15, color: '#626765' },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  verifiedText: { fontSize: 15, color: '#33CC87', fontWeight: '600' },
})
```

**Note:** If `AppIcon` doesn't have a `check` icon, replace `<AppIcon name="check" size={16} color="#33CC87" />` with `<Text style={{ fontSize: 16, color: '#33CC87' }}>✓</Text>`.

- [ ] **Step 2: Test deep-link verify flow in simulator**

1. Enter a handle (e.g. `vava_studio`)
2. "前往 Instagram 確認" button appears → tap it → Instagram app opens (or Safari to instagram.com/vava_studio)
3. Switch back to app → "✓ 確認是我的帳號" button → tap → green "已連結" badge appears
4. Next button becomes enabled
5. Tapping Skip works without any handle required

- [ ] **Step 3: Commit**

```bash
git add app/\(onboarding\)/pro/instagram.tsx
git commit -m "feat: Instagram deep-link verify on onboarding step 5"
```

---

## Task 6: Fix icon names if needed

**Files:**
- Modify: `constants/iconMap.ts` (only if `chevronDown` or `check` icons are missing)

- [ ] **Step 1: Check which icons exist**

```bash
grep -n 'chevronDown\|chevronRight\|check\|tick' myApp/constants/iconMap.ts
```

- [ ] **Step 2: If `chevronDown` is missing, add it**

Open `constants/iconMap.ts`, find the iconMap object, and add:

```ts
chevronDown: { solid: '\uf078', regular: '\uf078' },  // FA6 chevron-down
```

If that codepoint doesn't render correctly, use `forward` rotated via a `transform: [{ rotate: '90deg' }]` style on the icon wrapper instead (no iconMap change needed, just update the JSX in location.tsx).

- [ ] **Step 3: If `check` is missing, add it**

```ts
check: { solid: '\uf00c', regular: '\uf00c' },  // FA6 check
```

Or replace `<AppIcon name="check" ...>` usages with `<Text>✓</Text>` in location.tsx and instagram.tsx.

- [ ] **Step 4: Commit if changed**

```bash
git add constants/iconMap.ts
git commit -m "fix: add chevronDown and check to icon map"
```

---

## Self-Review

**Spec coverage:**
- ✅ City dropdown (Taiwan, 22 cities)
- ✅ 行政區 dropdown (filtered by city)
- ✅ Google Maps Places autocomplete for detail address
- ✅ Instagram deep-link verify (handle → open IG → confirm → verified badge)
- ✅ Exit button on every step (top-right X → account tab)

**Placeholder scan:** None found.

**Type consistency:** `studio_district` stores `"城市 行政區"` combined string (e.g. `"台北市 大安區"`) — matches the existing `submitted.tsx` upsert which writes `studio_district: draft.studio_district ?? ''` unchanged.
