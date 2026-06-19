import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Pressable, FlatList, Dimensions, View as RNView, Text as RNText, ActivityIndicator,
  Animated, PanResponder, Modal, ScrollView, StyleSheet, Linking,
} from 'react-native'
import { FilterBottomSheet } from '@/components/booking/FilterBottomSheet'
import { PriceRangeSlider } from '@/components/booking/PriceRangeSlider'
import { Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'
import { StatusBar } from 'expo-status-bar'
import { MapView, Marker } from '@/components/NativeMap'

import { Image } from 'expo-image'
import Svg, { Path, Rect } from 'react-native-svg'

import { useBookingRequest } from '@/lib/booking-context'
import { formatSlotTime, filterDisplayCats, buildScopeServiceLines } from '@/lib/booking-helpers'
import { apiPost } from '@/lib/api'

// ── Helpers ──

/** Render dot separators — dots inherit parent text color */
function colorDots(text: string): React.ReactNode {
  return text
}

// ── Types ──
type SlotItem = { id: string; startsAt: string; durationMinutes: number }
type ProResult = {
  pro: { id: string; displayName: string; district?: string; igHandle?: string; profilePhotoUrl?: string; portfolioUrls: string[] }
  slots: SlotItem[]
  priceRange: { min: number; max: number }
  distanceKm?: number
  lat?: number
  lng?: number
  studioAddress?: string
  studioName?: string
}

// ── API response type (mirrors backend MatchingSlotResult) ──
type ApiMatchResult = {
  pro: {
    id: string; displayName: string; profilePhotoUrl: string | null
    studioAddress: string; studioLat: number | null; studioLng: number | null
    igHandle: string | null; studioName: string | null; district: string | null
    portfolioUrls: string[]
  }
  slots: { id: string; startsAt: string; endsAt: string | null; durationMinutes: number }[]
  priceRange: { min: number; max: number }
  distanceKm: number | null
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')
const COLLAPSED_TOP = Math.round(SCREEN_HEIGHT / 2) - 48
const DRAG_BOTTOM_LIMIT = Math.round(SCREEN_HEIGHT * 0.5)

const TAIPEI_REGION = {
  latitude: 25.033,
  longitude: 121.5654,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

const CATEGORY_LABELS: Record<string, string> = {
  nails: '美甲師',
  lashes: '美睫師',
  makeup: '美妝師',
}

const CATEGORY_SHORT: Record<string, string> = {
  nails: '美甲',
  lashes: '美睫',
  makeup: '美妝',
}

const TIME_BAND_LABELS: Record<string, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
  any: '不限時段',
}

const WEEK_DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

function formatDateWithDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${m}/${d} ${WEEK_DAYS[date.getDay()]}`
}

// ── Screen ──
export default function ResultsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const categoryLabel = CATEGORY_LABELS[state.category ?? ''] ?? '設計師'

  type SortKey = 'distance' | 'price_asc' | 'price_desc'
  const [status, setStatus] = useState<'loading' | 'results' | 'empty' | 'error'>('loading')
  const [results, setResults] = useState<ProResult[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('distance')
  const [priceLow, setPriceLow] = useState<number>(state.budgetRange?.min ?? 0)
  const [priceHigh, setPriceHigh] = useState<number>(state.budgetRange?.max ?? 5000)
  const priceMax = 5000 // slider upper bound
  const hasPriceFilter = priceLow > 0 || priceHigh < priceMax
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [showPriceSheet, setShowPriceSheet] = useState(false)
  const mapRef = useRef<InstanceType<typeof MapView>>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedMapProId, _setSelectedMapProId] = useState<string | null>(null)
  const markerRenderCount = useRef(0)
  const flatListRef = useRef<FlatList>(null)

  // QA diagnostic: track state changes during pin switching
  const prevSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    console.log(`[QA:Detail] selectedMapProId: ${prevSelectedRef.current} → ${selectedMapProId}`)
    prevSelectedRef.current = selectedMapProId
  }, [selectedMapProId])

  function setSelectedMapProId(nextId: string | null) {
    console.log(`[QA:Detail] setSelectedMapProId called: ${selectedMapProId} → ${nextId}`)
    _setSelectedMapProId(nextId)
  }

  const expandAnim = useRef(new Animated.Value(0)).current

  const PILL_H = 68 // paddingV 12*2 + icon 44
  const CARD_H = 420

  function openRequest() {
    setRequestOpen(true)
    Animated.spring(expandAnim, { toValue: 1, useNativeDriver: false, damping: 22, stiffness: 220, mass: 0.8 }).start()
  }
  function closeRequest() {
    Animated.timing(expandAnim, { toValue: 0, duration: 260, useNativeDriver: false }).start(() => {
      setRequestOpen(false)
    })
  }

  // Container shape morph
  const reqLeft = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 16] })
  const reqRight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 16] })
  const reqMaxH = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [PILL_H, CARD_H] })
  const reqRadius = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [35, 36] })
  // Content cross-fade
  const pillOpacity = expandAnim.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' })
  const cardOpacity = expandAnim.interpolate({ inputRange: [0.15, 0.55], outputRange: [0, 1], extrapolate: 'clamp' })
  const scrimOpacity = expandAnim.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' })

  // ── Request pill / expanded card data ──
  const pillLine1 = useMemo(() => {
    const s = state.services
    const parts: string[] = []
    const scopeLines = buildScopeServiceLines(s)
    if (scopeLines.length) {
      parts.push(scopeLines.join('、'))
    } else {
      if (s?.nailScope) parts.push(s.nailScope)
      const cats = filterDisplayCats(s?.categoryIds ?? [], { removalType: s?.removalType, treatmentTier: s?.treatmentTier })
      if (cats.length) parts.push(cats.join(' • '))
      if (s?.styleId) parts.push(s.styleId)
      if (s?.treatmentTier) parts.push(`${s.treatmentTier}保養`)
      if (s?.removalType) parts.push(`卸甲（${s.removalType}）`)
    }
    if (parts.length === 0 && state.category) parts.push(CATEGORY_SHORT[state.category] ?? state.category)
    return parts.join(' • ')
  }, [state.services, state.category])

  const pillLine2 = useMemo(() => {
    const parts: string[] = []
    if (state.date === 'now') parts.push('現在')
    else if (state.date) {
      const [, m, d] = state.date.split('-').map(Number)
      parts.push(`${m}/${d}`)
    }
    if (state.location?.label) parts.push(state.location.label)
    return parts.join(' • ')
  }, [state.date, state.location])

  const expandedRows = useMemo(() => {
    const rows: { key: string; icon: AppIconName; text: string; textLines?: string[] }[] = []
    const s = state.services

    // Services — hand + foot as separate scope lines, or single scope
    const expandedScopeLines = buildScopeServiceLines(s)
    if (expandedScopeLines.length) {
      rows.push({
        key: 'svc',
        icon: 'serviceGeneric',
        text: '',
        textLines: expandedScopeLines,
      })
    } else {
      const svcParts: string[] = []
      if (s?.nailScope) svcParts.push(s.nailScope)
      const cats = filterDisplayCats(s?.categoryIds ?? [], { removalType: s?.removalType, treatmentTier: s?.treatmentTier })
      if (cats.length) svcParts.push(cats.join(' • '))
      if (s?.styleId) svcParts.push(s.styleId)
      if (s?.treatmentTier) svcParts.push(`${s.treatmentTier}保養`)
      if (s?.removalType) svcParts.push(`卸甲（${s.removalType}）`)
      if (s?.lashDensity) svcParts.push(s.lashDensity)
      if (s?.fiberTagId) svcParts.push(s.fiberTagId)
      const svcText = svcParts.join(' • ') || (state.category ? CATEGORY_SHORT[state.category] ?? state.category : '')
      if (svcText) rows.push({ key: 'svc', icon: 'serviceGeneric', text: svcText })
    }

    // Location
    if (state.location?.label) rows.push({ key: 'loc', icon: 'location', text: state.location.label })

    // Date
    if (state.date) {
      let dt = state.date === 'now' ? '現在（2小時內）' : formatDateWithDay(state.date)
      if (state.timeBand) dt += ` ・ ${TIME_BAND_LABELS[state.timeBand] ?? state.timeBand}`
      rows.push({ key: 'date', icon: 'calendar', text: dt })
    }

    // Extras
    const ext: string[] = []
    if (s?.fillInDays != null) ext.push(`填補 ${s.fillInDays} 天`)
    if (s?.styleTags?.length) ext.push(s.styleTags.join('、'))
    if (state.addons?.length) ext.push(state.addons.join('、'))
    if (state.preferences?.length) ext.push(state.preferences.join('、'))
    if (state.customerNote) ext.push(state.customerNote)
    if (ext.length) rows.push({ key: 'ext', icon: 'addCircle', text: ext.join('、') })

    return rows
  }, [state])

  const filteredResults = useMemo(() => {
    if (!hasPriceFilter) return results
    return results.filter((r) => r.priceRange.min <= priceHigh && r.priceRange.max >= priceLow)
  }, [results, priceLow, priceHigh, hasPriceFilter])

  const sortedResults = useMemo(() => {
    const copy = [...filteredResults]
    switch (sortKey) {
      case 'distance': return copy.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
      case 'price_asc': return copy.sort((a, b) => a.priceRange.min - b.priceRange.min)
      case 'price_desc': return copy.sort((a, b) => b.priceRange.min - a.priceRange.min)
      default: return copy
    }
  }, [filteredResults, sortKey])

  // Fallback: when filters produce 0 matches, show all results sorted by distance
  const hasMatches = sortedResults.length > 0
  const fallbackResults = useMemo(() => {
    if (hasMatches) return []
    return [...results].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
  }, [hasMatches, results])
  const listData = hasMatches ? sortedResults : fallbackResults

  const [detailPro, _setDetailPro] = useState<ProResult | null>(null)
  const prevDetailRef = useRef<string | null>(null)
  function setDetailPro(next: ProResult | null) {
    console.log(`[QA:Detail] detailPro: ${prevDetailRef.current} → ${next?.pro.id ?? 'null'}`)
    prevDetailRef.current = next?.pro.id ?? null
    _setDetailPro(next)
  }
  const detailAnim = useRef(new Animated.Value(0)).current
  function openProDetail(proResult: ProResult) {
    setDetailPro(proResult)
    Animated.spring(detailAnim, { toValue: -SCREEN_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20 }).start()
  }

  function closeProDetail() {
    console.log(`[QA:Card] closeProDetail: ${detailPro?.pro.id ?? 'none'} → none`)
    Animated.timing(detailAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      () => setDetailPro(null),
    )
  }

  // ── Draggable sheet ──
  // expandedTop = 12px below the pill (insets.top + 6 top + 68 pill height + 12 gap)
  const expandedTopRef = useRef(insets.top + 86)
  useEffect(() => { expandedTopRef.current = insets.top + 86 }, [insets.top])
  const sheetTopRef = useRef(COLLAPSED_TOP)
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_TOP)).current
  const detailProRef = useRef<ProResult | null>(null)

  useEffect(() => { detailProRef.current = detailPro }, [detailPro])

  function snapSheet(to: number) {
    sheetTopRef.current = to
    Animated.spring(sheetAnim, {
      toValue: to,
      useNativeDriver: false,
      bounciness: 3,
      speed: 14,
    }).start()
  }

  // Swipe-right anywhere on the pro detail content → back to list
  const detailSwipeBack = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 12 && dx > Math.abs(dy) * 2,
      onPanResponderGrant: () => { detailAnim.stopAnimation() },
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) detailAnim.setValue(Math.min(0, -SCREEN_WIDTH + dx))
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SCREEN_WIDTH * 0.3 || vx > 0.5) {
          Animated.timing(detailAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
            () => setDetailPro(null),
          )
        } else {
          Animated.spring(detailAnim, { toValue: -SCREEN_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20 }).start()
        }
      },
    })
  ).current

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dy) > 10 || (dx > 12 && dx > Math.abs(dy)),
      onPanResponderGrant: () => {
        sheetAnim.stopAnimation()
        detailAnim.stopAnimation()
      },
      onPanResponderMove: (_, { dx, dy }) => {
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Vertical — drag sheet up/down
          const next = Math.max(expandedTopRef.current, Math.min(DRAG_BOTTOM_LIMIT, sheetTopRef.current + dy))
          sheetAnim.setValue(next)
        } else if (dx > 0 && detailProRef.current) {
          // Horizontal rightward — drag detail panel back
          detailAnim.setValue(Math.min(0, -SCREEN_WIDTH + dx))
        }
      },
      onPanResponderRelease: (_, { dx, dy, vy, vx }) => {
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) && dx > 0
        if (isHorizontalSwipe) {
          if (detailProRef.current) {
            // Swipe right on detail → go back to list
            if (dx > SCREEN_WIDTH * 0.3 || vx > 0.5) {
              Animated.timing(detailAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
                () => setDetailPro(null),
              )
            } else {
              Animated.spring(detailAnim, { toValue: -SCREEN_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20 }).start()
            }
          } else if (dx > 60 || vx > 0.5) {
            // Swipe right on list → go back to request flow
            router.back()
          }
        } else {
          // Vertical — snap to nearest of two positions (top / bottom)
          const snapPoints = [expandedTopRef.current, DRAG_BOTTOM_LIMIT]
          const projected = sheetTopRef.current + dy + vy * 80 // momentum nudge
          const nearest = snapPoints.reduce((a, b) => Math.abs(a - projected) < Math.abs(b - projected) ? a : b)
          snapSheet(nearest)
        }
      },
    })
  ).current

  // ── Fetch matching pros from API ──
  const fetchResults = useCallback(async () => {
    setStatus('loading')
    try {
      // Build dates array: selected date + next 2 days for date tabs
      const dates: string[] = []
      if (state.date === 'now') {
        for (let i = 0; i < 3; i++) {
          const d = new Date()
          d.setDate(d.getDate() + i)
          dates.push(toYMD(d))
        }
      } else if (state.date) {
        const [y, m, d] = state.date.split('-').map(Number)
        for (let i = 0; i < 3; i++) {
          dates.push(toYMD(new Date(y, m - 1, d + i)))
        }
      }

      const body: Record<string, unknown> = {
        domain: state.category,
        dates,
      }
      if (state.location) {
        body.lat = state.location.lat
        body.lng = state.location.lng
      }
      if (state.timeBand && state.timeBand !== 'any') {
        body.timeBand = state.timeBand
      }
      if (state.services?.categoryIds?.length) {
        body.categoryIds = state.services.categoryIds
      }
      if (state.services?.styleId) {
        body.styleId = state.services.styleId
      }
      if (state.services?.nailScope) {
        body.nailScope = state.services.nailScope
      }
      if (state.services?.handCategoryIds?.length) {
        body.handCategoryIds = state.services.handCategoryIds
        body.handStyleId = state.services.handStyleId
        body.handTreatmentTier = state.services.handTreatmentTier
      }
      if (state.services?.footCategoryIds?.length) {
        body.footCategoryIds = state.services.footCategoryIds
        body.footStyleId = state.services.footStyleId
        body.footTreatmentTier = state.services.footTreatmentTier
      }

      const res = await apiPost<{ results: ApiMatchResult[]; total: number }>('/api/bookings/match', body)

      const mapped: ProResult[] = res.results.map(r => ({
        pro: {
          id: r.pro.id,
          displayName: r.pro.displayName,
          district: r.pro.district ?? undefined,
          igHandle: r.pro.igHandle ?? undefined,
          profilePhotoUrl: r.pro.profilePhotoUrl ?? undefined,
          portfolioUrls: r.pro.portfolioUrls ?? [],
        },
        slots: r.slots.map(s => ({
          id: s.id,
          startsAt: s.startsAt,
          durationMinutes: s.durationMinutes ?? 60,
        })),
        priceRange: r.priceRange,
        distanceKm: r.distanceKm ?? undefined,
        lat: r.pro.studioLat ?? undefined,
        lng: r.pro.studioLng ?? undefined,
        studioAddress: r.pro.studioAddress ?? undefined,
        studioName: r.pro.studioName ?? undefined,
      }))

      setResults(mapped)
      setStatus(mapped.length > 0 ? 'results' : 'empty')
    } catch (err) {
      // Root cause: /api/bookings/match endpoint not yet deployed — show
      // empty state so users see "no matching pros" instead of a retry loop.
      console.warn('[results] match error (showing empty state):', err)
      setResults([])
      setStatus('empty')
    }
  }, [state.category, state.date, state.timeBand, state.location, state.services])

  useEffect(() => { fetchResults() }, [fetchResults])


  function confirmSlot(proResult: ProResult, slot: SlotItem) {
    console.log(`[QA:Time] slot tap: pro=${proResult.pro.id} slot=${slot.id} time=${slot.startsAt}`)
    router.push({
      pathname: '/book/pro',
      params: {
        slotId: slot.id,
        proId: proResult.pro.id,
        startsAt: slot.startsAt,
        proName: proResult.pro.displayName,
        priceMin: String(proResult.priceRange.min),
        priceMax: String(proResult.priceRange.max),
        studioAddress: proResult.studioAddress ?? '',
        studioName: proResult.studioName ?? '',
        lat: String(proResult.lat ?? ''),
        lng: String(proResult.lng ?? ''),
        durationMinutes: String(slot.durationMinutes),
        slots: JSON.stringify(proResult.slots),
        igHandle: proResult.pro.igHandle ?? '',
      },
    })
  }

  function handleEditRequest() {
    dispatch({ type: 'SET_EDITING', payload: true })
    setRequestOpen(false)
    router.push('/book/category')
  }

  return (
    <RNView style={{ flex: 1 }}>
      <StatusBar style="dark" translucent />

      {/* ── Full-bleed map — fills entire screen behind sheet ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={TAIPEI_REGION}
        userInterfaceStyle="light"
        mapPadding={{ top: insets.top + 86, bottom: SCREEN_HEIGHT - COLLAPSED_TOP, left: 0, right: 0 }}
        legalLabelInsets={{ bottom: -(SCREEN_HEIGHT - COLLAPSED_TOP), left: 8, top: 0, right: 0 }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {(() => { markerRenderCount.current++; console.log(`[QA:Marker] render #${markerRenderCount.current} | total=${listData.filter(r => r.lat && r.lng && r.slots.length).length} | selectedPro=${selectedMapProId ?? 'none'}`); return null })()}
        {listData.map((r) => {
          if (!r.lat || !r.lng || !r.slots.length) return null
          if (r.pro.id === selectedMapProId) return null
          const earliest = new Date(r.slots[0].startsAt)
          const timeLabel = `${earliest.getHours()}:${String(earliest.getMinutes()).padStart(2, '0')}`
          return (
            <Marker
              key={r.pro.id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              onPress={() => {
                const isActive = selectedMapProId === r.pro.id
                console.log(`[QA:Detail] PIN TAP pro=${r.pro.id} wasActive=${isActive}`)
                setSelectedMapProId(isActive ? null : r.pro.id)
                if (!isActive) {
                  mapRef.current?.animateToRegion({
                    latitude: r.lat!,
                    longitude: r.lng!,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }, 350)
                  const idx = listData.findIndex((s) => s.pro.id === r.pro.id)
                  console.log(`[QA:Detail] scrollToIndex idx=${idx} for pro=${r.pro.id}`)
                  if (idx >= 0) flatListRef.current?.scrollToIndex({ index: idx, animated: true })
                }
              }}
            >
              {/* Fully static Marker — no isActive-dependent styles to avoid Fabric/MapKit crash */}
              <RNView style={{ alignItems: 'center' }}>
                <RNView style={{
                  backgroundColor: '#FBFBF8',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 4,
                }}>
                  <RNText style={{ fontSize: 13, fontWeight: '700', color: '#1F2723' }}>{timeLabel}</RNText>
                </RNView>
                <RNView style={{
                  width: 0, height: 0,
                  borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
                  borderLeftColor: 'transparent', borderRightColor: 'transparent',
                  borderTopColor: '#FBFBF8',
                  marginTop: -1,
                }} />
              </RNView>
            </Marker>
          )
        })}
        {/* Selected-pin overlay — separate Marker instance, mounts/unmounts independently */}
        {(() => {
          if (!selectedMapProId) return null
          const sel = listData.find((r) => r.pro.id === selectedMapProId)
          if (!sel?.lat || !sel?.lng || !sel.slots.length) return null
          const earliest = new Date(sel.slots[0].startsAt)
          const timeLabel = `${earliest.getHours()}:${String(earliest.getMinutes()).padStart(2, '0')}`
          return (
            <Marker
              key={`selected-${selectedMapProId}`}
              coordinate={{ latitude: sel.lat, longitude: sel.lng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              zIndex={999}
              onPress={() => {
                console.log(`[QA:Detail] OVERLAY TAP pro=${selectedMapProId} → deselect`)
                setSelectedMapProId(null)
              }}
            >
              <RNView style={{ alignItems: 'center' }}>
                {/* Name label — inside same Marker so it moves with the map */}
                <RNView style={{
                  backgroundColor: '#1F2723',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  marginBottom: 2,
                }}>
                  <RNText style={{ fontSize: 11, fontWeight: '600', color: '#FBFBF8' }}>{sel.pro.displayName}</RNText>
                </RNView>
                {/* Time pill */}
                <RNView style={{
                  backgroundColor: '#1F2723',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 6,
                }}>
                  <RNText style={{ fontSize: 13, fontWeight: '700', color: '#FBFBF8' }}>{timeLabel}</RNText>
                </RNView>
                <RNView style={{
                  width: 0, height: 0,
                  borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
                  borderLeftColor: 'transparent', borderRightColor: 'transparent',
                  borderTopColor: '#1F2723',
                  marginTop: -1,
                }} />
              </RNView>
            </Marker>
          )
        })()}
      </MapView>

      {/* ── Scrim (behind card, above map) ── */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.25)', opacity: scrimOpacity, zIndex: 4 }]}
        pointerEvents={requestOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={closeRequest} />
      </Animated.View>

      {/* ── Morphing request island: pill ↔ card ── */}
      <Animated.View
        style={{
          position: 'absolute',
          top: insets.top + 6,
          left: reqLeft,
          right: reqRight,
          borderRadius: reqRadius,
          zIndex: 5,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
      <Animated.View
        style={{
          maxHeight: reqMaxH,
          borderRadius: reqRadius,
          backgroundColor: '#FBFBF8',
          overflow: 'hidden',
        }}
      >
        {/* Pill layer (absolute overlay, fades out) */}
        <Animated.View
          pointerEvents={requestOpen ? 'none' : 'auto'}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
            opacity: pillOpacity,
          }}
        >
          <Pressable
            onPress={openRequest}
            accessibilityRole="button"
            accessibilityLabel="我的需求"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 16,
              paddingRight: 20,
              paddingVertical: 12,
              gap: 4,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <RNView style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', padding: 10 }}>
              <AppIcon name="receipt" size={22} color="#1F2723" weight="regular" />
            </RNView>
            <RNView style={{ flex: 1, gap: 1 }}>
              <Text fontSize={14} lineHeight={20} color="#1F2723" numberOfLines={1}>
                {colorDots(pillLine1)}
              </Text>
              <Text fontSize={13} lineHeight={20} color="#787D7B" numberOfLines={1}>
                {pillLine2}
              </Text>
            </RNView>
          </Pressable>
        </Animated.View>

        {/* Card layer (normal flow — drives container height, fades in) */}
        <Animated.View
          pointerEvents={requestOpen ? 'auto' : 'none'}
          style={{ padding: 16, gap: 20, opacity: cardOpacity }}
        >
          {/* Header */}
          <RNView style={{ gap: 12 }}>
            <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <RNView style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="receipt" size={20} color="#1F2723" weight="regular" />
              </RNView>
              <Text fontSize={16} fontWeight="700" color="#1F2723" style={{ flex: 1 }}>
                我的需求
              </Text>
              <Pressable
                onPress={closeRequest}
                accessibilityLabel="關閉"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => ({
                  width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                  borderRadius: 100,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <AppIcon name="close" size={24} color="#1F2723" />
              </Pressable>
            </RNView>

            {/* Detail rows */}
            <RNView style={{ gap: 12 }}>
              {expandedRows.map((row) => (
                <RNView
                  key={row.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 4,
                    borderRadius: 12,
                  }}
                >
                  <RNView style={{ width: 44, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name={row.icon} size={20} color="#A5A8A7" weight="regular" />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    {row.textLines ? (
                      row.textLines.map((line, i) => (
                        <Text key={i} fontSize={16} lineHeight={26} color="#1F2723">
                          {colorDots(line)}
                        </Text>
                      ))
                    ) : (
                      <Text fontSize={16} lineHeight={26} color="#1F2723">
                        {colorDots(row.text)}
                      </Text>
                    )}
                  </RNView>
                </RNView>
              ))}
            </RNView>
          </RNView>

          {/* Buttons */}
          <RNView style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => router.replace('/(tabs)/' as never)}
              style={({ pressed }) => ({
                width: 168, height: 48, borderRadius: 9999,
                borderWidth: 1, borderColor: '#D8D9D2',
                backgroundColor: pressed ? '#F6F4EF' : 'rgba(255,255,255,0.05)',
                alignItems: 'center', justifyContent: 'center',
              })}
            >
              <Text fontSize={15} fontWeight="500" lineHeight={24} color="#1F2723">取消搜尋</Text>
            </Pressable>
            <Pressable
              onPress={handleEditRequest}
              style={({ pressed }) => ({
                flex: 1, height: 48, borderRadius: 9999, backgroundColor: '#1F2723',
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text fontSize={15} fontWeight="500" lineHeight={24} color="#FBFBF8">修改需求</Text>
            </Pressable>
          </RNView>
        </Animated.View>
      </Animated.View>
      </Animated.View>

      {/* ── Draggable bottom sheet ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: sheetAnim,
          zIndex: 3,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        }}
      >
      <RNView
        style={{
          flex: 1,
          backgroundColor: '#FBFBF8',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* ── Handle + header (full drag zone; onStart=false lets taps reach Pressable) ── */}
        <RNView {...panResponder.panHandlers}>
          <RNView style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 12 }}>
            <RNView style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: '#D8D9D2' }} />
          </RNView>
          {/* Header — stable tree: toggle between detail name and filter bar + match count */}
          {detailPro ? (
            <RNView style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 32 }}>
              <Pressable
                onPress={closeProDetail}
                accessibilityRole="button"
                accessibilityLabel="返回"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <AppIcon name="back" size={18} color="#1F2723" />
              </Pressable>
              <Text
                fontSize={16}
                fontWeight="600"
                lineHeight={24}
                color="#1F2723"
                style={{ flex: 1, textAlign: 'center' }}
              >
                {detailPro.pro.displayName}
              </Text>
              <RNView style={{ width: 28 }} />
            </RNView>
          ) : (
            <>
              {/* Filter bar */}
              <RNView style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, gap: 12, height: 36,
              }}>
                {/* Filter icon button */}
                <Pressable
                  onPress={() => setShowFilterSheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel="篩選"
                  style={({ pressed }) => ({
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1, borderColor: '#E5E5E5',
                    backgroundColor: '#F8F8F8',
                    paddingHorizontal: 16,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <AppIcon name="filter" size={18} color="#1F2723" />
                </Pressable>

                {/* Sort chip */}
                <Pressable
                  onPress={() => setShowSortSheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel="排序"
                  style={({ pressed }) => ({
                    height: 36, borderRadius: 18,
                    borderWidth: 1, borderColor: '#E5E5E5',
                    backgroundColor: '#F8F8F8',
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, gap: 6,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <RNText style={{ fontSize: 13, fontWeight: '500', color: '#1F2723' }}>
                    {sortKey === 'distance' ? '距離' : sortKey === 'price_asc' ? '價格 ↑' : '價格 ↓'}
                  </RNText>
                  <AppIcon name="chevronDown" size={12} color="#787D7B" />
                </Pressable>

                {/* Price chip */}
                <Pressable
                  onPress={() => setShowPriceSheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel="價格篩選"
                  style={({ pressed }) => ({
                    height: 36, borderRadius: 18,
                    borderWidth: 1, borderColor: '#E5E5E5',
                    backgroundColor: '#F8F8F8',
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, gap: 6,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <RNText style={{ fontSize: 13, fontWeight: '500', color: '#1F2723' }}>
                    {'價格'}
                  </RNText>
                  <AppIcon name="chevronDown" size={12} color="#787D7B" />
                </Pressable>
              </RNView>

              {/* Match count — only when there are matches */}
              {hasMatches && (
                <RNView style={{ height: 32, justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 }}>
                  <Text
                    fontSize={13}
                    lineHeight={20}
                    color="#787D7B"
                    style={{ textAlign: 'center' }}
                  >
                    {`已有${sortedResults.length}位符合需求`}
                  </Text>
                </RNView>
              )}
            </>
          )}
        </RNView>

        {/* ── States — always mounted, hidden via display to avoid Fabric mount crash ── */}
        <RNView style={status === 'loading' ? { flex: 1, alignItems: 'center', justifyContent: 'center' } : { display: 'none' }}>
          <ActivityIndicator size="large" color="#1F2723" />
        </RNView>
        <RNView style={status === 'empty' ? { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 } : { display: 'none' }}>
          <Text fontSize={16} color="#8F9391" textAlign="center">目前沒有符合條件的{categoryLabel}</Text>
          <Pressable onPress={() => router.back()} style={{ borderRadius: 9999, height: 48, paddingHorizontal: 24, backgroundColor: '#1F2723', alignItems: 'center', justifyContent: 'center' }}>
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">修改需求</Text>
          </Pressable>
        </RNView>
        <RNView style={status === 'error' ? { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 } : { display: 'none' }}>
          <Text fontSize={16} color="#8F9391">載入失敗</Text>
          <Pressable onPress={fetchResults} style={{ borderRadius: 9999, height: 48, paddingHorizontal: 24, backgroundColor: '#1F2723', alignItems: 'center', justifyContent: 'center' }}>
            <Text fontSize={16} fontWeight="600" color="#FBFBF8">重試</Text>
          </Pressable>
        </RNView>

        {/* ── Results: horizontal slide between list and detail — always mounted ── */}
        <RNView style={status === 'results' ? { flex: 1 } : { display: 'none' }}>
            <Animated.View style={{ flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * 2, transform: [{ translateX: detailAnim }] }}>
              {/* Left panel: list */}
              <RNView style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <FlatList
                  ref={flatListRef}
                  data={listData}
                  keyExtractor={(item) => item.pro.id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 80 }}
                  onScrollToIndexFailed={(info) => {
                    flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true })
                  }}
                  ItemSeparatorComponent={() => <RNView style={{ height: 1, backgroundColor: '#E8E9E9', marginLeft: 16, marginRight: 20 }} />}
                  ListHeaderComponent={!hasMatches ? (
                    <RNView style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
                      {/* Empty state message */}
                      <Text fontSize={16} fontWeight="600" lineHeight={24} color="#1F2723" style={{ textAlign: 'center' }}>
                        找不到符合需求的設計師
                      </Text>
                      <Text fontSize={14} lineHeight={22} color="#787D7B" style={{ textAlign: 'center', marginTop: 8 }}>
                        你可以試試：調整預算、更改日期或時段
                      </Text>
                      <Pressable
                        onPress={handleEditRequest}
                        accessibilityRole="button"
                        style={({ pressed }) => ({
                          marginTop: 16,
                          alignSelf: 'center',
                          borderRadius: 9999,
                          height: 40,
                          paddingHorizontal: 24,
                          backgroundColor: '#1F2723',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.75 : 1,
                        })}
                      >
                        <Text fontSize={14} fontWeight="600" color="#FBFBF8">修改需求</Text>
                      </Pressable>

                      {/* Divider */}
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 8 }}>
                        <RNView style={{ flex: 1, height: 1, backgroundColor: '#E8E9E9' }} />
                        <Text fontSize={13} lineHeight={20} color="#787D7B" style={{ paddingHorizontal: 12 }}>
                          或是看看
                        </Text>
                        <RNView style={{ flex: 1, height: 1, backgroundColor: '#E8E9E9' }} />
                      </RNView>
                    </RNView>
                  ) : null}
                  renderItem={({ item: proResult, index }) => {
                    console.log(`[QA:Detail] FlatList renderItem idx=${index} pro=${proResult.pro.id}`)
                    return (
                      <ProCard
                        proResult={proResult}
                        onSelectSlot={confirmSlot}
                        onPress={() => {}}
                      />
                    )
                  }}
                />
              </RNView>

              {/* Right panel: pro detail */}
              <RNView {...detailSwipeBack.panHandlers} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                  {/* Photo banner */}
                  <RNView style={{ height: 180, backgroundColor: '#7E334B' }} />

                  {/* Info */}
                  <RNView style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
                    <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
                        {detailPro?.pro.displayName ?? ''}
                      </Text>
                      <AppIcon name="rating" size={11} color="#8F9391" weight="solid" />
                      <Text fontSize={13} lineHeight={20} color="#8F9391">4.9 (176)</Text>
                    </RNView>
                    {/* Location — always mounted, hidden via opacity when no district */}
                    <RNView style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      opacity: detailPro?.pro.district ? 1 : 0,
                      height: detailPro?.pro.district ? undefined : 0,
                    }}>
                      <AppIcon name="location" size={12} color="#8F9391" weight="solid" />
                      <Text fontSize={13} lineHeight={20} color="#8F9391">
                        {detailPro?.pro.district ?? ''}
                        {detailPro?.distanceKm != null ? `　${detailPro.distanceKm.toFixed(1)}km` : ''}
                      </Text>
                    </RNView>

                    {/* Price — stable tree: same structure, only text/icon props change */}
                    {(() => {
                      const services = state.services?.categoryIds ?? []
                      const addons = state.addons ?? []
                      const items = [...services, ...addons]
                      const label = items.join('＋')
                      const price = detailPro?.priceRange.min ?? 0
                      const hasLabel = !!label
                      return (
                        <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <AppIcon name={hasLabel ? 'serviceGeneric' : 'price'} size={12} color="#4A5A52" weight={hasLabel ? 'solid' : undefined} />
                          <Text fontSize={13} lineHeight={20} color="#4A5A52">
                            {hasLabel ? `${label}　` : `$${price} – ${detailPro?.priceRange.max} TWD`}
                            {hasLabel && <Text fontWeight="600" color="#1F2723">${price} TWD 起</Text>}
                          </Text>
                        </RNView>
                      )
                    })()}

                    {/* IG portfolio link — always mounted, hidden via opacity */}
                    <Pressable
                      onPress={() => detailPro?.pro.igHandle && Linking.openURL(`https://instagram.com/${detailPro.pro.igHandle}`)}
                      accessibilityRole="link"
                      accessibilityLabel={detailPro?.pro.igHandle ? `@${detailPro.pro.igHandle} Instagram` : ''}
                      disabled={!detailPro?.pro.igHandle}
                      style={({ pressed }) => ({
                        opacity: detailPro?.pro.igHandle ? (pressed ? 0.6 : 1) : 0,
                        height: detailPro?.pro.igHandle ? undefined : 0,
                        alignSelf: 'flex-start',
                      })}
                    >
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppIcon name="instagram" size={13} color="#8F9391" />
                        <Text fontSize={13} lineHeight={20} color="#8F9391">@{detailPro?.pro.igHandle ?? ''}</Text>
                      </RNView>
                    </Pressable>
                  </RNView>

                  {/* Divider */}
                  <RNView style={{ height: 1, backgroundColor: '#E7E8E1', marginHorizontal: 16, marginTop: 16 }} />

                  {/* Slots */}
                  <RNView style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
                    <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text fontSize={15} fontWeight="600" lineHeight={22} color="#1F2723">可預約時段</Text>
                      <Text fontSize={12} lineHeight={20} color="#8F9391" style={{ opacity: state.date ? 1 : 0 }}>
                        {state.date === 'now' ? '現在（2小時內）' : (state.date ?? ' ')}
                      </Text>
                    </RNView>
                    <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {detailPro?.slots.map((slot) => (
                          <Pressable
                            key={slot.id}
                            onPress={() => { if (detailPro) confirmSlot(detailPro, slot) }}
                            accessibilityRole="button"
                            accessibilityLabel={formatSlotTime(slot.startsAt)}
                            style={({ pressed }) => ({
                              backgroundColor: '#FBFBF8',
                              borderWidth: 1,
                              borderColor: '#D8D9D2',
                              borderRadius: 8,
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text fontSize={13} lineHeight={20} color="#1F2723">
                              {formatSlotTime(slot.startsAt)}
                            </Text>
                          </Pressable>
                      ))}
                    </RNView>
                  </RNView>
                </ScrollView>
              </RNView>
            </Animated.View>

        </RNView>
      </RNView>
      </Animated.View>

      {/* ── Sort Bottom Sheet ── */}
      <SortSheet
        visible={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        currentSort={sortKey}
        onApply={(key) => { setSortKey(key); setShowSortSheet(false) }}
      />

      {/* ── Price Bottom Sheet ── */}
      <PriceSheet
        visible={showPriceSheet}
        onClose={() => setShowPriceSheet(false)}
        currentLow={priceLow}
        currentHigh={priceHigh}
        max={priceMax}
        onApply={(low, high) => { setPriceLow(low); setPriceHigh(high); setShowPriceSheet(false) }}
      />

      {/* ── Filter Bottom Sheet ── */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        currentSort={sortKey}
        currentPriceLow={priceLow}
        currentPriceHigh={priceHigh}
        priceMax={priceMax}
        onApply={(sort, low, high) => { setSortKey(sort); setPriceLow(low); setPriceHigh(high); setShowFilterSheet(false) }}
      />

    </RNView>
  )
}

// ── Sort Sheet ──
type SortSheetKey = 'distance' | 'price_asc' | 'price_desc'
const SORT_OPTIONS: { key: SortSheetKey; icon: AppIconName; label: string }[] = [
  { key: 'distance', icon: 'location', label: '距離最近' },
  { key: 'price_asc', icon: 'price', label: '價格由低到高' },
  { key: 'price_desc', icon: 'tags', label: '價格由高到低' },
]

function SortSheet({ visible, onClose, currentSort, onApply }: {
  visible: boolean
  onClose: () => void
  currentSort: SortSheetKey
  onApply: (key: SortSheetKey) => void
}) {
  const [preview, setPreview] = useState<SortSheetKey>(currentSort)
  useEffect(() => { if (visible) setPreview(currentSort) }, [visible, currentSort])

  function select(key: SortSheetKey) {
    setPreview(key)
    setTimeout(() => onApply(key), 100)
  }

  const cardGap = 10
  const hPad = 20
  const cardWidth = (SCREEN_WIDTH - hPad * 2 - cardGap * 2) / 3

  return (
    <FilterBottomSheet visible={visible} onClose={onClose} title="排序方式">
      <RNView style={{ paddingHorizontal: hPad, paddingBottom: 8 }}>
        <RNView style={{ flexDirection: 'row', gap: cardGap }}>
          {SORT_OPTIONS.map((opt) => {
            const selected = preview === opt.key
            return (
              <Pressable
                key={opt.key}
                onPress={() => select(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  width: cardWidth,
                  height: 100,
                  borderRadius: 12,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? '#FD6B59' : '#E5E5E5',
                  backgroundColor: selected ? 'rgba(253,107,89,0.1)' : '#FBFBF8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <AppIcon
                  name={opt.icon}
                  size={22}
                  color={selected ? '#FD6B59' : '#1F2723'}
                  weight={selected ? 'solid' : 'regular'}
                />
                <RNText style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: selected ? '#FD6B59' : '#1F2723',
                  textAlign: 'center',
                }}>
                  {opt.label}
                </RNText>
              </Pressable>
            )
          })}
        </RNView>
      </RNView>
    </FilterBottomSheet>
  )
}

// ── Price Sheet ──
function PriceSheet({ visible, onClose, currentLow, currentHigh, max, onApply }: {
  visible: boolean
  onClose: () => void
  currentLow: number
  currentHigh: number
  max: number
  onApply: (low: number, high: number) => void
}) {
  const [draftLow, setDraftLow] = useState(currentLow)
  const [draftHigh, setDraftHigh] = useState(currentHigh)
  useEffect(() => { if (visible) { setDraftLow(currentLow); setDraftHigh(currentHigh) } }, [visible, currentLow, currentHigh])

  return (
    <FilterBottomSheet visible={visible} onClose={onClose} title="價格範圍">
      <RNView style={{ paddingHorizontal: 20, gap: 16 }}>
        {/* Range display */}
        <RNText style={{ fontSize: 22, fontWeight: '700', color: '#1F2723', textAlign: 'center' }}>
          NT${draftLow.toLocaleString()}–{draftHigh.toLocaleString()}
        </RNText>

        {/* Slider */}
        <PriceRangeSlider
          min={0}
          max={max}
          lowValue={draftLow}
          highValue={draftHigh}
          onLowChange={setDraftLow}
          onHighChange={setDraftHigh}
        />

        {/* Buttons */}
        <RNView style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() => { setDraftLow(0); setDraftHigh(max) }}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flex: 1, height: 52, borderRadius: 9999,
              borderWidth: 1, borderColor: '#E5E5E5',
              backgroundColor: '#FFFFFF',
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <RNText style={{ fontSize: 16, fontWeight: '500', color: '#1F2723' }}>重設</RNText>
          </Pressable>
          <Pressable
            onPress={() => onApply(draftLow, draftHigh)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flex: 1, height: 52, borderRadius: 9999,
              backgroundColor: '#1F2723',
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <RNText style={{ fontSize: 16, fontWeight: '600', color: '#FBFBF8' }}>套用</RNText>
          </Pressable>
        </RNView>
      </RNView>
    </FilterBottomSheet>
  )
}

// ── Filter Sheet ──
function FilterSheet({ visible, onClose, currentSort, currentPriceLow, currentPriceHigh, priceMax, onApply }: {
  visible: boolean
  onClose: () => void
  currentSort: SortSheetKey
  currentPriceLow: number
  currentPriceHigh: number
  priceMax: number
  onApply: (sort: SortSheetKey, low: number, high: number) => void
}) {
  const [draftSort, setDraftSort] = useState<SortSheetKey>(currentSort)
  const [draftLow, setDraftLow] = useState(currentPriceLow)
  const [draftHigh, setDraftHigh] = useState(currentPriceHigh)

  useEffect(() => {
    if (visible) {
      setDraftSort(currentSort)
      setDraftLow(currentPriceLow)
      setDraftHigh(currentPriceHigh)
    }
  }, [visible, currentSort, currentPriceLow, currentPriceHigh])

  const cardGap = 10
  const hPad = 20
  const cardWidth = (SCREEN_WIDTH - hPad * 2 - cardGap * 2) / 3

  function reset() {
    setDraftSort('distance')
    setDraftLow(0)
    setDraftHigh(priceMax)
  }

  return (
    <FilterBottomSheet visible={visible} onClose={onClose} title="篩選條件">
      <RNView style={{ paddingHorizontal: hPad, gap: 24 }}>
        {/* 排序 */}
        <RNView style={{ gap: 10 }}>
          <RNText style={{ fontSize: 14, fontWeight: '600', color: '#1F2723' }}>排序</RNText>
          <RNView style={{ flexDirection: 'row', gap: cardGap }}>
            {SORT_OPTIONS.map((opt) => {
              const selected = draftSort === opt.key
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setDraftSort(opt.key)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  style={({ pressed }) => ({
                    width: cardWidth,
                    height: 100,
                    borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? '#FD6B59' : '#E5E5E5',
                    backgroundColor: selected ? 'rgba(253,107,89,0.1)' : '#FBFBF8',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <AppIcon
                    name={opt.icon}
                    size={22}
                    color={selected ? '#FD6B59' : '#1F2723'}
                    weight={selected ? 'solid' : 'regular'}
                  />
                  <RNText style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: selected ? '#FD6B59' : '#1F2723',
                    textAlign: 'center',
                  }}>
                    {opt.label}
                  </RNText>
                </Pressable>
              )
            })}
          </RNView>
        </RNView>

        {/* 價格 — slider */}
        <RNView style={{ gap: 10 }}>
          <RNText style={{ fontSize: 14, fontWeight: '600', color: '#1F2723' }}>價格</RNText>
          <RNText style={{ fontSize: 16, fontWeight: '600', color: '#1F2723', textAlign: 'center' }}>
            NT${draftLow.toLocaleString()}–{draftHigh.toLocaleString()}
          </RNText>
          <PriceRangeSlider
            min={0}
            max={priceMax}
            lowValue={draftLow}
            highValue={draftHigh}
            onLowChange={setDraftLow}
            onHighChange={setDraftHigh}
          />
        </RNView>
      </RNView>

      {/* Buttons */}
      <RNView style={{ flexDirection: 'row', gap: 12, paddingHorizontal: hPad, marginTop: 20 }}>
        <Pressable
          onPress={reset}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flex: 1, height: 52, borderRadius: 9999,
            borderWidth: 1, borderColor: '#E5E5E5',
            backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <RNText style={{ fontSize: 16, fontWeight: '500', color: '#1F2723' }}>重設</RNText>
        </Pressable>
        <Pressable
          onPress={() => onApply(draftSort, draftLow, draftHigh)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flex: 1, height: 52, borderRadius: 9999,
            backgroundColor: '#1F2723',
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <RNText style={{ fontSize: 16, fontWeight: '600', color: '#FBFBF8' }}>套用篩選</RNText>
        </Pressable>
      </RNView>
    </FilterBottomSheet>
  )
}

// ── Placeholder color for pros without portfolio photos ──
const PLACEHOLDER_PHOTO_BG = '#E8E9E9'

// ── Pro result card ──
function ProCard({
  proResult,
  onSelectSlot,
  onPress,
}: {
  proResult: ProResult
  onSelectSlot: (proResult: ProResult, slot: SlotItem) => void
  onPress: (proResult: ProResult) => void
}) {
  const insets = useSafeAreaInsets()

  // QA: track ProCard mount/unmount lifecycle
  useEffect(() => {
    console.log(`[QA:Detail] mount ProCard key=${proResult.pro.id}`)
    return () => console.log(`[QA:Detail] unmount ProCard key=${proResult.pro.id}`)
  }, [])

  const [showGallery, setShowGallery] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const galleryDragY = useRef(new Animated.Value(0)).current

  function closeGallery() {
    console.log('[QA:Gallery] closeGallery called')
    setShowGallery(false)
    setGalleryIndex(0)
    galleryDragY.setValue(0)
  }

  function openGallery() {
    if (photos.length === 0) return
    console.log(`[QA:Detail] gallery OPEN for pro=${proResult.pro.id}`)
    galleryDragY.setValue(0)
    setGalleryIndex(0)
    setShowGallery(true)
  }

  const galleryPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy, dx }) => {
        const isVertical = Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.5
        if (isVertical) console.log('[QA:Gallery] swipe start')
        return isVertical
      },
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) galleryDragY.setValue(dy)
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        console.log(`[QA:Gallery] swipe release dy=${Math.round(dy)}`)
        if (dy > 80 || vy > 0.5) {
          console.log('[QA:Gallery] swipe threshold passed')
          Animated.timing(galleryDragY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true })
            .start(() => {
              console.log('[QA:Gallery] closeGallery called from=swipe')
              closeGallery()
            })
        } else {
          Animated.spring(galleryDragY, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start()
        }
      },
    })
  ).current

  const photos = proResult.pro.portfolioUrls.length > 0 ? proResult.pro.portfolioUrls : []
  const photoCount = photos.length

  const locationParts = [
    proResult.distanceKm != null ? `${proResult.distanceKm.toFixed(1)}km` : null,
    proResult.pro.district ?? null,
  ].filter(Boolean)
  const locationText = locationParts.join(' • ')

  return (
    <RNView style={{
      backgroundColor: '#FBFBF8',
      flexDirection: 'row',
      paddingLeft: 8,
      paddingVertical: 16,
      gap: 12,
    }}>
      {/* Left: stacked photo thumbnail */}
      <Pressable
        onPress={() => openGallery()}
        accessibilityRole="button"
        accessibilityLabel={`查看 ${photoCount} 張作品照`}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, alignSelf: 'center', padding: 8 })}
      >
        <RNView style={{
          width: 120, height: 130, position: 'relative',
          overflow: 'visible',
          shadowColor: '#000', shadowOpacity: 0.1,
          shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
        }}>
          {/* Third layer — deepest, counter-clockwise tilt (always mounted, opacity-toggled) */}
          <RNView style={{
            position: 'absolute', top: 0, left: 0,
            width: 120, height: 130,
            borderRadius: 8,
            backgroundColor: PLACEHOLDER_PHOTO_BG,
            opacity: photoCount >= 3 ? 0.5 : 0,
            transform: [{ rotate: '-2.28deg' }],
            overflow: 'hidden',
            zIndex: 1,
          }}>
            {photos[2] && <Image source={{ uri: photos[2] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
            <RNView style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(255,255,255,0.3)',
            }} />
          </RNView>

          {/* Second layer — clockwise tilt (always mounted, opacity-toggled) */}
          <RNView style={{
            position: 'absolute', top: 0, left: 0,
            width: 120, height: 130,
            borderRadius: 8,
            backgroundColor: PLACEHOLDER_PHOTO_BG,
            opacity: photoCount >= 2 ? 0.5 : 0,
            transform: [{ rotate: '5.81deg' }],
            overflow: 'hidden',
            zIndex: 2,
          }}>
            {photos[1] && <Image source={{ uri: photos[1] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />}
            <RNView style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(255,255,255,0.3)',
            }} />
          </RNView>

          {/* Front photo — sharp, full opacity */}
          <RNView style={{
            position: 'absolute', top: 0, left: 0,
            width: 120, height: 130,
            borderRadius: 8,
            backgroundColor: PLACEHOLDER_PHOTO_BG,
            overflow: 'hidden',
            zIndex: 3,
            shadowColor: '#000', shadowOpacity: 0.12,
            shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}>
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : proResult.pro.profilePhotoUrl ? (
              <Image source={{ uri: proResult.pro.profilePhotoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : null}
          </RNView>
        </RNView>
      </Pressable>

      {/* Right: content — aligned to stack's padding: top 8 + front image 130 = 138 total */}
      <RNView style={{ flex: 1, justifyContent: 'space-between', paddingRight: 0, paddingTop: 8, paddingBottom: 4, height: 130 + 16 }}>
        {/* Text info — name, location, price (tappable to open pro detail) */}
        <Pressable
          onPress={() => onPress(proResult)}
          accessibilityRole="button"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, gap: 2 })}
        >
          <RNView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
            <Text
              fontSize={18}
              fontWeight="700"
              lineHeight={24}
              color="#1F2723"
              numberOfLines={1}
              style={{ letterSpacing: -0.36, flex: 1 }}
            >
              {proResult.pro.displayName}
            </Text>
            {/* IG badge — always mounted, hidden via opacity */}
            <Pressable
              onPress={(e) => { e.stopPropagation(); if (proResult.pro.igHandle) Linking.openURL(`https://instagram.com/${proResult.pro.igHandle}`) }}
              accessibilityRole="link"
              accessibilityLabel={`${proResult.pro.displayName} 作品集`}
              disabled={!proResult.pro.igHandle}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 3,
                borderRadius: 6, backgroundColor: 'rgba(232,233,233,0.5)',
                opacity: proResult.pro.igHandle ? (pressed ? 0.6 : 1) : 0,
                width: proResult.pro.igHandle ? undefined : 0,
                overflow: 'hidden',
              })}
            >
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Rect x={2} y={2} width={20} height={20} rx={5} stroke="#787D7B" strokeWidth={2} />
                <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="#787D7B" strokeWidth={2} />
                <Path d="M17.5 6.5h.01" stroke="#787D7B" strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text fontSize={12} lineHeight={18} color="#787D7B">作品集</Text>
            </Pressable>
          </RNView>

          {/* Location — always mounted, hidden via opacity */}
          <Text
            fontSize={14}
            lineHeight={20}
            color="#787D7B"
            style={{ opacity: locationText ? 1 : 0, height: locationText ? undefined : 0 }}
          >
            {locationText || ' '}
          </Text>

          <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="price" size={13} color="#1F2723" weight="regular" />
            <Text fontSize={14} lineHeight={20} color="#1F2723">
              預估價格約 ${proResult.priceRange.min}
            </Text>
          </RNView>

          <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="time" size={13} color="#1F2723" weight="regular" />
            <Text fontSize={14} lineHeight={20} color="#1F2723">
              {proResult.slots[0]?.durationMinutes ?? 60} min
            </Text>
          </RNView>
        </Pressable>

        {/* Time slots */}
        <RNView style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <RNView style={{ flexDirection: 'row', gap: 8 }}>
              {proResult.slots.map((slot) => (
                  <Pressable
                    key={slot.id}
                    onPress={() => onSelectSlot(proResult, slot)}
                    accessibilityRole="button"
                    accessibilityLabel={formatSlotTime(slot.startsAt)}
                    style={({ pressed }) => ({
                      backgroundColor: '#FBFBF8',
                      borderWidth: 1,
                      borderColor: '#E8E9E9',
                      borderRadius: 6,
                      height: 32,
                      paddingHorizontal: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text fontSize={13} fontWeight="600" color="#1F2723" textAlign="center">
                      {formatSlotTime(slot.startsAt)}
                    </Text>
                  </Pressable>
              ))}
            </RNView>
          </ScrollView>
        </RNView>
      </RNView>

      {/* Photo gallery modal */}
      <Modal
        visible={showGallery}
        transparent
        animationType="none"
        onRequestClose={() => { console.log('[QA:Gallery] X close'); closeGallery() }}
      >
        <RNView style={{ flex: 1 }}>
          {/* Backdrop — tap anywhere outside content to close */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}
            onPress={() => { console.log('[QA:Gallery] backdrop tap close'); closeGallery() }}
          />

          {/* Gallery content — black bg slides down with swipe */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', transform: [{ translateY: galleryDragY }] }]}
            pointerEvents="box-none"
          >
            {/* Header: X left, name center */}
            <RNView style={{ paddingTop: insets.top, zIndex: 10 }} pointerEvents="box-none">
              <RNView style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 12 }} pointerEvents="box-none">
                <Pressable
                  onPress={() => { console.log('[QA:Gallery] X close'); closeGallery() }}
                  accessibilityRole="button"
                  accessibilityLabel="關閉相簿"
                  style={({ pressed }) => ({
                    width: 44, height: 44,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <AppIcon name="close" size={20} color="#FFFFFF" />
                </Pressable>
                <RNView style={{ flex: 1, alignItems: 'center' }} pointerEvents="none">
                  <Text fontSize={16} fontWeight="600" lineHeight={24} color="#FFFFFF">
                    {proResult.pro.displayName}
                  </Text>
                </RNView>
                <RNView style={{ width: 44 }} pointerEvents="none" />
              </RNView>
            </RNView>

            {/* Image — absolute centered, with swipe-down pan gesture */}
            <RNView
              {...galleryPan.panHandlers}
              style={{
                position: 'absolute', left: 0, right: 0,
                top: (SCREEN_HEIGHT - SCREEN_WIDTH * 1.25) / 2,
              }}
            >
              <FlatList
                data={photos}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                style={{ width: SCREEN_WIDTH }}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                  setGalleryIndex(index)
                }}
                renderItem={({ item: url }) => (
                  <RNView style={{
                    width: SCREEN_WIDTH,
                    height: SCREEN_WIDTH * 1.25,
                    backgroundColor: PLACEHOLDER_PHOTO_BG,
                  }}>
                    <Image source={{ uri: url }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
                  </RNView>
                )}
              />
            </RNView>

            {/* Page counter — bottom of screen, centered */}
            {photoCount > 1 && (
              <RNView style={{
                position: 'absolute', left: 0, right: 0,
                bottom: insets.bottom,
                alignItems: 'center',
              }} pointerEvents="none">
                <Text fontSize={15} lineHeight={22} color="#FFFFFF">
                  {galleryIndex + 1}/{photoCount}
                </Text>
              </RNView>
            )}
          </Animated.View>
        </RNView>
      </Modal>
    </RNView>
  )
}

