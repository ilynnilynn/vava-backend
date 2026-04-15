import { useState } from 'react'
import { Alert } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'

import { StepLayout } from '@/components/booking/StepLayout'
import { SelectionChip } from '@/components/booking/SelectionChip'
import { SectionExpander } from '@/components/booking/SectionExpander'
import { useBookingRequest } from '@/lib/booking-context'

// ── Nails options ──
const NAIL_SERVICES = ['凝膠', '卸甲', '修補', '保養'] as const
const NAIL_STYLES = ['單色', '設計款', '貓眼', '法式', '漸層', '鏡面'] as const
const TREATMENT_TIERS = ['基本', '深層'] as const
const NAIL_SCOPES = ['手', '腳', '手+腳'] as const

// ── Lash options ──
const LASH_SERVICES = ['嫁接', '補睫', '卸睫', '睫毛管理'] as const
const FILL_IN_DAYS = [
  { label: '≤14天', value: 14 },
  { label: '15-21天', value: 18 },
  { label: '>21天', value: 22 },
] as const
const LASH_DIRECTIONS = ['日式', '韓式', '歐美', '新中式', '特殊毛種', '不確定'] as const
const LASH_DENSITY = ['自然輕盈', '日常妝感', '極致濃密'] as const
const STYLE_TAGS = ['狐系', '漫畫款', '仙女款', '太陽花', '流蘇'] as const
const FIBER_TAGS = ['山茶花', '人魚編織(YY)', '6D羽毛', '6D棉花', '三葉草'] as const

export default function ServiceScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()
  const category = state.category

  // ── Nails state ──
  const [nailServices, setNailServices] = useState<string[]>(
    state.services?.categoryIds ?? [],
  )
  const [nailStyle, setNailStyle] = useState<string | null>(
    state.services?.styleId ?? null,
  )
  const [treatmentTier, setTreatmentTier] = useState<string | null>(
    state.services?.treatmentTier ?? null,
  )
  const [nailScope, setNailScope] = useState<string | null>(
    state.services?.nailScope ?? null,
  )

  // ── Lash state ──
  const [lashServices, setLashServices] = useState<string[]>(
    state.services?.categoryIds ?? [],
  )
  const [fillInDays, setFillInDays] = useState<number | null>(
    state.services?.fillInDays ?? null,
  )
  const [lashDirection, setLashDirection] = useState<string | null>(
    state.services?.styleId ?? null,
  )
  const [lashDensity, setLashDensity] = useState<string | null>(
    state.services?.lashDensity ?? null,
  )
  const [selectedStyleTags, setSelectedStyleTags] = useState<string[]>(
    state.services?.styleTags ?? [],
  )
  const [fiberTag, setFiberTag] = useState<string | null>(
    state.services?.fiberTagId ?? null,
  )

  // ── Nail helpers ──
  function toggleNailService(s: string) {
    setNailServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  const showNailStyle = nailServices.includes('凝膠')
  const showTreatmentTier = nailServices.includes('保養')

  // ── Lash helpers ──
  function toggleLashService(s: string) {
    setLashServices((prev) => {
      // 卸睫 can be multi-selected with 嫁接 or 補睫
      // Other main services are single-select among themselves
      if (s === '卸睫') {
        return prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
      }
      if (s === '睫毛管理') {
        return prev.includes(s) ? prev.filter((x) => x !== s) : [s, ...prev.filter((x) => x === '卸睫')]
      }
      // 嫁接 or 補睫: replace any existing main (non-卸睫) selection
      const withoutMain = prev.filter((x) => x === '卸睫')
      return prev.includes(s) ? prev.filter((x) => x !== s) : [...withoutMain, s]
    })
  }

  function handleFillInDays(val: number) {
    if (val === 22) {
      Alert.alert(
        '建議更換服務',
        '超過 21 天建議選擇嫁接而非補睫',
        [
          {
            text: '切換到嫁接',
            onPress: () => {
              setLashServices((prev) => {
                const without = prev.filter((x) => x !== '補睫')
                return without.includes('嫁接') ? without : [...without, '嫁接']
              })
              setFillInDays(null)
            },
          },
          { text: '取消', style: 'cancel' },
        ],
      )
      return
    }
    setFillInDays(val)
  }

  const showFillIn = lashServices.includes('補睫')
  const showLashDirection = lashServices.includes('嫁接') || lashServices.includes('補睫')
  const showDensity = showLashDirection && lashDirection !== null && lashDirection !== '不確定'
  const showStyleTags = lashDirection === '新中式'
  const showFiberTag = lashDirection === '特殊毛種'

  // ── Validation ──
  function canProceedNails(): boolean {
    if (nailServices.length === 0) return false
    if (showTreatmentTier && !treatmentTier) return false
    if (!nailScope) return false
    return true
  }

  function canProceedLashes(): boolean {
    return lashServices.length > 0
  }

  function handleConfirm() {
    if (category === 'nails') {
      dispatch({
        type: 'SET_SERVICES',
        payload: {
          categoryIds: nailServices,
          styleId: nailStyle,
          nailScope,
          lashDensity: null,
          treatmentTier,
          fillInDays: null,
          fiberTagId: null,
          styleTags: [],
        },
      })
    } else {
      dispatch({
        type: 'SET_SERVICES',
        payload: {
          categoryIds: lashServices,
          styleId: lashDirection,
          nailScope: null,
          lashDensity: lashDensity,
          treatmentTier: null,
          fillInDays: fillInDays,
          fiberTagId: fiberTag,
          styleTags: selectedStyleTags,
        },
      })
    }
    router.push('/book/extras')
  }

  const canProceed = category === 'nails' ? canProceedNails() : canProceedLashes()

  return (
    <StepLayout
      title="選擇服務"
      currentStep={4}
      totalSteps={6}
      onNext={handleConfirm}
      nextDisabled={!canProceed}
    >
      {category === 'nails' ? (
        <NailsUI
          nailServices={nailServices}
          toggleNailService={toggleNailService}
          showNailStyle={showNailStyle}
          nailStyle={nailStyle}
          setNailStyle={setNailStyle}
          showTreatmentTier={showTreatmentTier}
          treatmentTier={treatmentTier}
          setTreatmentTier={setTreatmentTier}
          nailScope={nailScope}
          setNailScope={setNailScope}
        />
      ) : (
        <LashesUI
          lashServices={lashServices}
          toggleLashService={toggleLashService}
          showFillIn={showFillIn}
          fillInDays={fillInDays}
          handleFillInDays={handleFillInDays}
          showLashDirection={showLashDirection}
          lashDirection={lashDirection}
          setLashDirection={setLashDirection}
          showDensity={showDensity}
          lashDensity={lashDensity}
          setLashDensity={setLashDensity}
          showStyleTags={showStyleTags}
          selectedStyleTags={selectedStyleTags}
          setSelectedStyleTags={setSelectedStyleTags}
          showFiberTag={showFiberTag}
          fiberTag={fiberTag}
          setFiberTag={setFiberTag}
        />
      )}
    </StepLayout>
  )
}

// ── Nails sub-UI ──
function NailsUI({
  nailServices,
  toggleNailService,
  showNailStyle,
  nailStyle,
  setNailStyle,
  showTreatmentTier,
  treatmentTier,
  setTreatmentTier,
  nailScope,
  setNailScope,
}: {
  nailServices: string[]
  toggleNailService: (s: string) => void
  showNailStyle: boolean
  nailStyle: string | null
  setNailStyle: (s: string | null) => void
  showTreatmentTier: boolean
  treatmentTier: string | null
  setTreatmentTier: (s: string | null) => void
  nailScope: string | null
  setNailScope: (s: string | null) => void
}) {
  return (
    <YStack gap={24} paddingTop={8}>
      {/* Service type — multi-select */}
      <YStack gap={12}>
        <Text fontSize={16} fontWeight="700" color="#1F2723">
          服務類型
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {NAIL_SERVICES.map((s) => (
            <SelectionChip
              key={s}
              label={s}
              selected={nailServices.includes(s)}
              onPress={() => toggleNailService(s)}
            />
          ))}
        </XStack>
      </YStack>

      {/* Style — only if 凝膠 */}
      <SectionExpander visible={showNailStyle}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            選擇款式（可選）
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {NAIL_STYLES.map((s) => (
              <SelectionChip
                key={s}
                label={s}
                selected={nailStyle === s}
                onPress={() => setNailStyle(nailStyle === s ? null : s)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      {/* Treatment tier — only if 保養 */}
      <SectionExpander visible={showTreatmentTier}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            保養類型
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {TREATMENT_TIERS.map((s) => (
              <SelectionChip
                key={s}
                label={s}
                selected={treatmentTier === s}
                onPress={() => setTreatmentTier(s)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      {/* Scope — always */}
      <YStack gap={12}>
        <Text fontSize={16} fontWeight="700" color="#1F2723">
          手/腳
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {NAIL_SCOPES.map((s) => (
            <SelectionChip
              key={s}
              label={s}
              selected={nailScope === s}
              onPress={() => setNailScope(s)}
            />
          ))}
        </XStack>
      </YStack>
    </YStack>
  )
}

// ── Lashes sub-UI ──
function LashesUI({
  lashServices,
  toggleLashService,
  showFillIn,
  fillInDays,
  handleFillInDays,
  showLashDirection,
  lashDirection,
  setLashDirection,
  showDensity,
  lashDensity,
  setLashDensity,
  showStyleTags,
  selectedStyleTags,
  setSelectedStyleTags,
  showFiberTag,
  fiberTag,
  setFiberTag,
}: {
  lashServices: string[]
  toggleLashService: (s: string) => void
  showFillIn: boolean
  fillInDays: number | null
  handleFillInDays: (val: number) => void
  showLashDirection: boolean
  lashDirection: string | null
  setLashDirection: (s: string | null) => void
  showDensity: boolean
  lashDensity: string | null
  setLashDensity: (s: string | null) => void
  showStyleTags: boolean
  selectedStyleTags: string[]
  setSelectedStyleTags: React.Dispatch<React.SetStateAction<string[]>>
  showFiberTag: boolean
  fiberTag: string | null
  setFiberTag: (s: string | null) => void
}) {
  function toggleStyleTag(tag: string) {
    setSelectedStyleTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    )
  }

  return (
    <YStack gap={24} paddingTop={8}>
      {/* Service type */}
      <YStack gap={12}>
        <Text fontSize={16} fontWeight="700" color="#1F2723">
          服務類型
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {LASH_SERVICES.map((s) => (
            <SelectionChip
              key={s}
              label={s}
              selected={lashServices.includes(s)}
              onPress={() => toggleLashService(s)}
            />
          ))}
        </XStack>
      </YStack>

      {/* Fill-in days — only if 補睫 */}
      <SectionExpander visible={showFillIn}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            上次接睫時間
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {FILL_IN_DAYS.map((d) => (
              <SelectionChip
                key={d.label}
                label={d.label}
                selected={fillInDays === d.value}
                onPress={() => handleFillInDays(d.value)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      {/* Direction — if 嫁接 or 補睫 */}
      <SectionExpander visible={showLashDirection}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            嫁接方向（可選）
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {LASH_DIRECTIONS.map((d) => (
              <SelectionChip
                key={d}
                label={d}
                selected={lashDirection === d}
                onPress={() => setLashDirection(lashDirection === d ? null : d)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      {/* Density */}
      <SectionExpander visible={showDensity}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            濃密度（可選）
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {LASH_DENSITY.map((d) => (
              <SelectionChip
                key={d}
                label={d}
                selected={lashDensity === d}
                onPress={() => setLashDensity(lashDensity === d ? null : d)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      {/* Style tags — only if 新中式 */}
      <SectionExpander visible={showStyleTags}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            風格標籤（可選）
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {STYLE_TAGS.map((t) => (
              <SelectionChip
                key={t}
                label={t}
                selected={selectedStyleTags.includes(t)}
                onPress={() => toggleStyleTag(t)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      {/* Fiber tag — only if 特殊毛種 */}
      <SectionExpander visible={showFiberTag}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            毛種類型
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {FIBER_TAGS.map((f) => (
              <SelectionChip
                key={f}
                label={f}
                selected={fiberTag === f}
                onPress={() => setFiberTag(fiberTag === f ? null : f)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>
    </YStack>
  )
}
