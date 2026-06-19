import { useState } from 'react'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'

import { StepLayout } from '@/components/booking/StepLayout'
import { SelectionChip } from '@/components/booking/SelectionChip'
import { SectionExpander } from '@/components/booking/SectionExpander'
import { useBookingRequest } from '@/lib/booking-context'

// ── Nails options ──
const NAIL_SERVICES = ['凝膠', '卸甲', '修補', '保養', '矯正'] as const
const NAIL_STYLES = ['單色', '跳色', '法式', '漸層', '貓眼', '鏡面', '手繪', '海莉', '不挑款/設計款'] as const
const TREATMENT_TIERS = ['基本', '深層'] as const
const NAIL_SCOPES = ['手', '腳', '手+腳'] as const

// ── Lash options ──
const LASH_SERVICES = ['嫁接', '卸睫', '睫毛管理'] as const
const LASH_DIRECTIONS = ['日式', '韓式', '歐美', '新中式', '特殊毛種', '不確定'] as const
const LASH_DENSITY = ['輕盈', '妝感', '濃密'] as const
const STYLE_TAGS = ['狐系', '漫畫款', '仙女款', '太陽花', '流蘇'] as const
const FIBER_TAGS = ['山茶花', '人魚編織(YY)', '6D羽毛', '6D棉花', '三葉草'] as const

export default function ServiceScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()
  const category = state.category

  // ── Nails state (single scope: 手 or 腳) ──
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

  // ── Nails state (手+腳 split) ──
  const [handServices, setHandServices] = useState<string[]>(
    state.services?.handCategoryIds ?? [],
  )
  const [handStyle, setHandStyle] = useState<string | null>(
    state.services?.handStyleId ?? null,
  )
  const [handTreatmentTier, setHandTreatmentTier] = useState<string | null>(
    state.services?.handTreatmentTier ?? null,
  )
  const [footServices, setFootServices] = useState<string[]>(
    state.services?.footCategoryIds ?? [],
  )
  const [footStyle, setFootStyle] = useState<string | null>(
    state.services?.footStyleId ?? null,
  )
  const [footTreatmentTier, setFootTreatmentTier] = useState<string | null>(
    state.services?.footTreatmentTier ?? null,
  )

  // ── Lash state ──
  const [lashServices, setLashServices] = useState<string[]>(
    state.services?.categoryIds ?? [],
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
  const isSplit = nailScope === '手+腳'

  function makeToggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (s: string) =>
      setter((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
      )
  }
  const toggleNailServiceRaw = makeToggle(setNailServices)
  const toggleNailService = (s: string) => {
    toggleNailServiceRaw(s)
    if (s === '保養' && !nailServices.includes(s)) setTreatmentTier('基本')
    if (s === '保養' && nailServices.includes(s)) setTreatmentTier(null)
  }
  const toggleHandServiceRaw = makeToggle(setHandServices)
  const toggleHandService = (s: string) => {
    toggleHandServiceRaw(s)
    if (s === '保養' && !handServices.includes(s)) setHandTreatmentTier('基本')
    if (s === '保養' && handServices.includes(s)) setHandTreatmentTier(null)
  }
  const toggleFootServiceRaw = makeToggle(setFootServices)
  const toggleFootService = (s: string) => {
    toggleFootServiceRaw(s)
    if (s === '保養' && !footServices.includes(s)) setFootTreatmentTier('基本')
    if (s === '保養' && footServices.includes(s)) setFootTreatmentTier(null)
  }

  // ── Lash helpers ──
  function toggleLashService(s: string) {
    setLashServices((prev) => {
      if (s === '卸睫') {
        return prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
      }
      if (s === '睫毛管理') {
        return prev.includes(s) ? prev.filter((x) => x !== s) : [s, ...prev.filter((x) => x === '卸睫')]
      }
      const withoutMain = prev.filter((x) => x === '卸睫')
      return prev.includes(s) ? prev.filter((x) => x !== s) : [...withoutMain, s]
    })
  }

  const showLashDirection = lashServices.includes('嫁接')
  const showDensity = showLashDirection && lashDirection !== null && lashDirection !== '不確定'
  const showStyleTags = showLashDirection && lashDirection === '新中式'
  const showFiberTag = showLashDirection && lashDirection === '特殊毛種'

  // ── Validation ──
  function canProceedNails(): boolean {
    if (!nailScope) return false
    if (isSplit) {
      if (handServices.length === 0 || footServices.length === 0) return false
    } else {
      if (nailServices.length === 0) return false
    }
    return true
  }

  function canProceedLashes(): boolean {
    return lashServices.length > 0
  }

  function deriveRemovalType(cats: string[]): string | null {
    if (!cats.includes('卸甲')) return null
    return cats.includes('凝膠') ? '續做' : '不續做'
  }

  function handleConfirm() {
    if (category === 'nails') {
      if (isSplit) {
        const allCategoryIds = [...new Set([...handServices, ...footServices])]
        dispatch({
          type: 'SET_SERVICES',
          payload: {
            categoryIds: allCategoryIds,
            styleId: null,
            nailScope,
            lashDensity: null,
            treatmentTier: null,
            removalType: deriveRemovalType(allCategoryIds),
            fillInDays: null,
            fiberTagId: null,
            styleTags: [],
            handCategoryIds: handServices,
            handStyleId: handStyle,
            handTreatmentTier,
            footCategoryIds: footServices,
            footStyleId: footStyle,
            footTreatmentTier,
          },
        })
      } else {
        dispatch({
          type: 'SET_SERVICES',
          payload: {
            categoryIds: nailServices,
            styleId: nailStyle,
            nailScope,
            lashDensity: null,
            treatmentTier,
            removalType: deriveRemovalType(nailServices),
            fillInDays: null,
            fiberTagId: null,
            styleTags: [],
            handCategoryIds: null,
            handStyleId: null,
            handTreatmentTier: null,
            footCategoryIds: null,
            footStyleId: null,
            footTreatmentTier: null,
          },
        })
      }
    } else {
      dispatch({
        type: 'SET_SERVICES',
        payload: {
          categoryIds: lashServices,
          styleId: lashDirection,
          nailScope: null,
          lashDensity: lashDensity,
          treatmentTier: null,
          removalType: null,
          fillInDays: null,
          fiberTagId: fiberTag,
          styleTags: selectedStyleTags,
          handCategoryIds: null,
          handStyleId: null,
          handTreatmentTier: null,
          footCategoryIds: null,
          footStyleId: null,
          footTreatmentTier: null,
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
          nailScope={nailScope}
          setNailScope={setNailScope}
          isSplit={isSplit}
          nailServices={nailServices}
          toggleNailService={toggleNailService}
          nailStyle={nailStyle}
          setNailStyle={setNailStyle}
          treatmentTier={treatmentTier}
          setTreatmentTier={setTreatmentTier}
          handServices={handServices}
          toggleHandService={toggleHandService}
          handStyle={handStyle}
          setHandStyle={setHandStyle}
          handTreatmentTier={handTreatmentTier}
          setHandTreatmentTier={setHandTreatmentTier}
          footServices={footServices}
          toggleFootService={toggleFootService}
          footStyle={footStyle}
          setFootStyle={setFootStyle}
          footTreatmentTier={footTreatmentTier}
          setFootTreatmentTier={setFootTreatmentTier}
        />
      ) : (
        <LashesUI
          lashServices={lashServices}
          toggleLashService={toggleLashService}
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

// ── Reusable nail service section (service chips + style + tier) ──
function NailServiceSection({
  label,
  services,
  onToggle,
  style,
  onStyleChange,
  tier,
  onTierChange,
}: {
  label: string
  services: string[]
  onToggle: (s: string) => void
  style: string | null
  onStyleChange: (s: string | null) => void
  tier: string | null
  onTierChange: (s: string | null) => void
}) {
  const showStyle = services.includes('凝膠')
  // 保養類型 hidden — default to '基本', customer decides at store
  const showTier = false

  return (
    <YStack gap={16}>
      <YStack gap={12}>
        <Text fontSize={16} fontWeight="700" color="#1F2723">
          {label}
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {NAIL_SERVICES.map((s) => (
            <SelectionChip
              key={s}
              label={s}
              selected={services.includes(s)}
              onPress={() => onToggle(s)}
            />
          ))}
        </XStack>
      </YStack>

      <SectionExpander visible={showStyle}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            選擇款式（可選）
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {NAIL_STYLES.map((s) => (
              <SelectionChip
                key={s}
                label={s}
                selected={style === s}
                onPress={() => onStyleChange(style === s ? null : s)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>

      <SectionExpander visible={showTier}>
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            保養類型
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {TREATMENT_TIERS.map((s) => (
              <SelectionChip
                key={s}
                label={s}
                selected={tier === s}
                onPress={() => onTierChange(s)}
              />
            ))}
          </XStack>
        </YStack>
      </SectionExpander>
    </YStack>
  )
}

// ── Nails sub-UI ──
function NailsUI({
  nailScope,
  setNailScope,
  isSplit,
  nailServices,
  toggleNailService,
  nailStyle,
  setNailStyle,
  treatmentTier,
  setTreatmentTier,
  handServices,
  toggleHandService,
  handStyle,
  setHandStyle,
  handTreatmentTier,
  setHandTreatmentTier,
  footServices,
  toggleFootService,
  footStyle,
  setFootStyle,
  footTreatmentTier,
  setFootTreatmentTier,
}: {
  nailScope: string | null
  setNailScope: (s: string | null) => void
  isSplit: boolean
  nailServices: string[]
  toggleNailService: (s: string) => void
  nailStyle: string | null
  setNailStyle: (s: string | null) => void
  treatmentTier: string | null
  setTreatmentTier: (s: string | null) => void
  handServices: string[]
  toggleHandService: (s: string) => void
  handStyle: string | null
  setHandStyle: (s: string | null) => void
  handTreatmentTier: string | null
  setHandTreatmentTier: (s: string | null) => void
  footServices: string[]
  toggleFootService: (s: string) => void
  footStyle: string | null
  setFootStyle: (s: string | null) => void
  footTreatmentTier: string | null
  setFootTreatmentTier: (s: string | null) => void
}) {
  return (
    <YStack flex={1} gap={24} paddingTop={16}>
      {/* Scope — always first */}
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

      {/* Service sections */}
      {isSplit ? (
        <>
          <NailServiceSection
            label="手部服務"
            services={handServices}
            onToggle={toggleHandService}
            style={handStyle}
            onStyleChange={setHandStyle}
            tier={handTreatmentTier}
            onTierChange={setHandTreatmentTier}
          />
          <View height={1} backgroundColor="#F3F0EA" />
          <NailServiceSection
            label="腳部服務"
            services={footServices}
            onToggle={toggleFootService}
            style={footStyle}
            onStyleChange={setFootStyle}
            tier={footTreatmentTier}
            onTierChange={setFootTreatmentTier}
          />
        </>
      ) : (
        <NailServiceSection
          label="服務類型"
          services={nailServices}
          onToggle={toggleNailService}
          style={nailStyle}
          onStyleChange={setNailStyle}
          tier={treatmentTier}
          onTierChange={setTreatmentTier}
        />
      )}
    </YStack>
  )
}

// ── Lashes sub-UI ──
function LashesUI({
  lashServices,
  toggleLashService,
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
    <YStack flex={1} gap={24} paddingTop={16}>
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

      {/* Direction — only if 嫁接 */}
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
