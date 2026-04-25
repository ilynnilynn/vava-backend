import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Pressable, FlatList, Dimensions, View as RNView, ActivityIndicator,
  Animated, PanResponder, Modal, ScrollView, StyleSheet, Linking, Alert,
} from 'react-native'
import { YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'
import { StatusBar } from 'expo-status-bar'
import MapView, { Marker } from 'react-native-maps'

import { Image } from 'expo-image'

import { useBookingRequest } from '@/lib/booking-context'
import { apiPost } from '@/lib/api'
import { formatSlotTime } from '@/lib/booking-helpers'
import { HeartButton } from '@/components/HeartButton'
import { fetchLikedPros, likePro, unlikePro, isProLiked } from '@/lib/liked-pros-api'
import type { LikedPro } from '@/types/liked-pros'

// ── Types ──
type SlotItem = { id: string; startsAt: string; durationMinutes: number }
type ProResult = {
  pro: { id: string; displayName: string; district?: string; igHandle?: string }
  slots: SlotItem[]
  priceRange: { min: number; max: number }
  distanceKm?: number
  lat?: number
  lng?: number
}
type MatchResponse = { results: ProResult[]; total: number }
type SelectedSlot = {
  slotId: string
  proId: string
  startsAt: string
  proName: string
  priceMin: number
  priceMax: number
  studioAddress?: string
}

// ── Fake data ──

// Returns ISO string for a time on today's date at hh:mm
function todayAt(h: number, m: number): string {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString().slice(0, 19)
}

// Returns the next :00 or :30 boundary at least `minAheadMins` from now
function nextHalfHour(minAheadMins = 15): Date {
  const d = new Date(Date.now() + minAheadMins * 60000)
  const m = d.getMinutes()
  if (m < 30) d.setMinutes(30, 0, 0)
  else { d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1) }
  return d
}

// All :00/:30 slots from `start` up to `start + 2h`
function nowSlots(): string[] {
  const slots: string[] = []
  const cursor = nextHalfHour(15)
  const cutoff = Date.now() + 120 * 60000
  while (cursor.getTime() <= cutoff) {
    slots.push(cursor.toISOString().slice(0, 19))
    cursor.setMinutes(cursor.getMinutes() + 30)
  }
  return slots
}

function makeFakeResults(dateParam: string | null): ProResult[] {
  const isNow = dateParam === 'now'

  let available: string[]
  if (isNow) {
    available = nowSlots()
  } else {
    available = [
      todayAt(9, 0), todayAt(9, 30), todayAt(10, 0), todayAt(10, 30),
      todayAt(11, 0), todayAt(13, 0), todayAt(13, 30), todayAt(14, 0),
      todayAt(15, 0), todayAt(15, 30), todayAt(16, 0), todayAt(17, 30),
    ]
  }

  const pick = (indices: number[], id: string, dur: number) =>
    indices
      .filter((i) => i < available.length)
      .map((i) => ({ id: `${id}${i}`, startsAt: available[i], durationMinutes: dur }))

  return [
    {
      pro: { id: '1', displayName: 'Joy', district: '大安區', igHandle: 'joy.nails.tw' },
      slots: pick([0, 1, 2, 3], 'j', 60),
      priceRange: { min: 800, max: 1200 },
      distanceKm: 1.1, lat: 25.033, lng: 121.543,
      studioAddress: '台北市大安區忠孝東路四段 216 號 3 樓',
    },
    {
      pro: { id: '2', displayName: 'Momo', district: '信義區', igHandle: 'momo_lash_studio' },
      slots: pick([0, 2, 3], 'm', 90),
      priceRange: { min: 650, max: 950 },
      distanceKm: 2.4, lat: 25.041, lng: 121.565,
      studioAddress: '台北市信義區松仁路 100 號 2 樓',
    },
    {
      pro: { id: '3', displayName: 'Lily', district: '松山區', igHandle: 'lily.beauty.nails' },
      slots: pick([1, 2, 3], 'l', 60),
      priceRange: { min: 750, max: 1100 },
      distanceKm: 3.2, lat: 25.050, lng: 121.570,
      studioAddress: '台北市松山區南京東路五段 88 號 4 樓',
    },
    {
      pro: { id: '4', displayName: 'Nina', district: '中山區' },
      slots: pick([0, 1, 3], 'n', 75),
      priceRange: { min: 900, max: 1400 },
      distanceKm: 0.8, lat: 25.062, lng: 121.530,
      studioAddress: '台北市中山區林森北路 368 號 5 樓',
    },
  ]
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')
const COLLAPSED_TOP = Math.round(SCREEN_HEIGHT / 3)
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
  return `${dateStr}　${WEEK_DAYS[date.getDay()]}`
}

// ── Screen ──
export default function ResultsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const categoryLabel = CATEGORY_LABELS[state.category ?? ''] ?? '設計師'

  const [status, setStatus] = useState<'loading' | 'results' | 'empty' | 'error'>('loading')
  const [results, setResults] = useState<ProResult[]>([])
  const [selected, setSelected] = useState<SelectedSlot | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [detailPro, setDetailPro] = useState<ProResult | null>(null)
  const detailAnim = useRef(new Animated.Value(0)).current
  const [likedPros, setLikedPros] = useState<LikedPro[]>([])

  useEffect(() => {
    fetchLikedPros().then(setLikedPros).catch(() => {})
  }, [])

  async function handleHeartToggle(proId: string, proDisplayName: string, serviceDomain: 'nails' | 'lashes') {
    const wasLiked = isProLiked(proId, likedPros)
    if (wasLiked) {
      setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
      await unlikePro(proId).catch(() => {
        setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: proDisplayName, service_domain: serviceDomain, profile_photo_url: null }])
      })
    } else {
      setLikedPros((prev) => [...prev, { pro_id: proId, pro_display_name: proDisplayName, service_domain: serviceDomain, profile_photo_url: null }])
      await likePro(proId).catch(() => {
        setLikedPros((prev) => prev.filter((p) => p.pro_id !== proId))
      })
    }
  }

  function openProDetail(proResult: ProResult) {
    setDetailPro(proResult)
    Animated.spring(detailAnim, { toValue: -SCREEN_WIDTH, useNativeDriver: true, bounciness: 0, speed: 20 }).start()
  }

  function closeProDetail() {
    Animated.timing(detailAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      () => setDetailPro(null),
    )
  }

  // ── Draggable sheet ──
  // expandedTop = 12px below the floating back button (insets.top + 8 top + 36 height + 12 gap)
  const expandedTopRef = useRef(insets.top + 56)
  useEffect(() => { expandedTopRef.current = insets.top + 56 }, [insets.top])
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
          // Vertical — snap to nearest of three positions
          const snapPoints = [expandedTopRef.current, COLLAPSED_TOP, DRAG_BOTTOM_LIMIT]
          const projected = sheetTopRef.current + dy + vy * 80 // momentum nudge
          const nearest = snapPoints.reduce((a, b) => Math.abs(a - projected) < Math.abs(b - projected) ? a : b)
          snapSheet(nearest)
        }
      },
    })
  ).current

  // ── Fetch (fake data for UI preview) ──
  const fetchResults = useCallback(async () => {
    setStatus('loading')
    setTimeout(() => {
      setResults(makeFakeResults(state.date))
      setStatus('results')
    }, 600)
  }, [state.date])

  useEffect(() => { fetchResults() }, [fetchResults])

  function selectSlot(proResult: ProResult, slot: SlotItem) {
    if (selected?.slotId === slot.id) {
      setSelected(null)
      return
    }
    setSelected({
      slotId: slot.id,
      proId: proResult.pro.id,
      startsAt: slot.startsAt,
      proName: proResult.pro.displayName,
      priceMin: proResult.priceRange.min,
      priceMax: proResult.priceRange.max,
    })
  }

  function handleConfirm() {
    if (!selected) return
    router.push({
      pathname: '/book/confirm',
      params: {
        slotId: selected.slotId,
        proId: selected.proId,
        startsAt: selected.startsAt,
        proName: selected.proName,
        priceMin: String(selected.priceMin),
        priceMax: String(selected.priceMax),
        studioAddress: selected.studioAddress ?? '',
      },
    })
  }

  function handleEditRequest() {
    dispatch({ type: 'SET_EDITING', payload: true })
    setShowRequest(false)
    router.push('/book/category')
  }

  return (
    <RNView style={{ flex: 1 }}>
      <StatusBar style="dark" translucent />

      {/* ── Full-bleed map — fills entire screen behind sheet ── */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={TAIPEI_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {results.map((r) =>
          r.lat && r.lng ? (
            <Marker
              key={r.pro.id}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              title={r.pro.displayName}
              pinColor="#1F2723"
            />
          ) : null,
        )}
      </MapView>

      {/* ── Floating back button ── */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="返回"
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <FA6ProIcon name="chevron-left" size={16} color="#1F2723" />
      </Pressable>

      {/* ── Floating cancel (X) button ── */}
      <Pressable
        onPress={() =>
          Alert.alert(
            '確定要離開嗎？',
            '目前的預約內容會被清除。',
            [
              { text: '繼續預約', style: 'cancel' },
              { text: '離開', style: 'destructive', onPress: () => { dispatch({ type: 'RESET' }); router.back() } },
            ]
          )
        }
        accessibilityRole="button"
        accessibilityLabel="取消預約流程"
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + 8,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <FA6ProIcon name="xmark" size={16} color="#1F2723" />
      </Pressable>

      {/* ── Draggable bottom sheet ── */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: sheetAnim,
          backgroundColor: '#FBFBF8',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
          overflow: 'hidden',
        }}
      >
        {/* ── Handle + header (full drag zone; onStart=false lets taps reach Pressable) ── */}
        <RNView {...panResponder.panHandlers}>
          <RNView style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 12 }}>
            <RNView style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: '#D8D9D2' }} />
          </RNView>
          <RNView style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44 }}>
            {detailPro ? (
              <>
                <Pressable
                  onPress={closeProDetail}
                  accessibilityRole="button"
                  accessibilityLabel="返回"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <FA6ProIcon name="chevron-left" size={18} color="#1F2723" />
                </Pressable>
                <Text fontSize={16} fontWeight="600" lineHeight={24} color="#1F2723" style={{ flex: 1, textAlign: 'center' }}>
                  {detailPro.pro.displayName}
                </Text>
                <RNView style={{ width: 28 }} />
              </>
            ) : (
              <>
                <RNView style={{ flex: 1 }} />
                <Text fontSize={16} fontWeight="600" lineHeight={24} color="#1F2723">
                  已有{results.length}位符合需求
                </Text>
                <RNView style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Pressable
                    onPress={() => setShowRequest(true)}
                    accessibilityRole="button"
                    accessibilityLabel="查看需求"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => ({
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: '#F0EDE5',
                      alignItems: 'center', justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <FA6ProIcon name="sliders" size={14} color="#1F2723" />
                  </Pressable>
                </RNView>
              </>
            )}
          </RNView>
        </RNView>

        {/* ── States (loading / empty / error) ── */}
        {status === 'loading' && (
          <RNView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#1F2723" />
          </RNView>
        )}
        {status === 'empty' && (
          <RNView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }}>
            <Text fontSize={16} color="#626765" textAlign="center">目前沒有符合條件的{categoryLabel}</Text>
            <Pressable onPress={() => router.back()} style={{ borderRadius: 9999, height: 48, paddingHorizontal: 24, backgroundColor: '#1F2723', alignItems: 'center', justifyContent: 'center' }}>
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">修改需求</Text>
            </Pressable>
          </RNView>
        )}
        {status === 'error' && (
          <RNView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }}>
            <Text fontSize={16} color="#626765">載入失敗</Text>
            <Pressable onPress={fetchResults} style={{ borderRadius: 9999, height: 48, paddingHorizontal: 24, backgroundColor: '#1F2723', alignItems: 'center', justifyContent: 'center' }}>
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">重試</Text>
            </Pressable>
          </RNView>
        )}

        {/* ── Results: horizontal slide between list and detail ── */}
        {status === 'results' && (
          <>
            <Animated.View style={{ flex: 1, flexDirection: 'row', width: SCREEN_WIDTH * 2, transform: [{ translateX: detailAnim }] }}>
              {/* Left panel: list */}
              <RNView style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.pro.id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}
                  renderItem={({ item: proResult }) => (
                    <ProCard
                      proResult={proResult}
                      selected={selected}
                      onSelectSlot={selectSlot}
                      serviceLabel={state.services?.categoryIds?.[0] ?? null}
                      onPress={openProDetail}
                      isLiked={isProLiked(proResult.pro.id, likedPros)}
                      onHeartToggle={() => handleHeartToggle(
                        proResult.pro.id,
                        proResult.pro.displayName,
                        state.category === 'nails' ? 'nails' : 'lashes',
                      )}
                    />
                  )}
                />
              </RNView>

              {/* Right panel: pro detail */}
              <RNView {...detailSwipeBack.panHandlers} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                  {/* Photo banner */}
                  <RNView style={{ height: 180, backgroundColor: '#7E334B' }} />

                  {/* Info */}
                  <RNView style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
                    <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
                        {detailPro?.pro.displayName ?? ''}
                      </Text>
                      <FA6ProIcon name="star" size={11} color="#626765" weight="solid" />
                      <Text fontSize={13} lineHeight={20} color="#626765">4.9 (176)</Text>
                    </RNView>
                    {detailPro?.pro.district ? (
                      <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <FA6ProIcon name="location-dot" size={12} color="#626765" weight="solid" />
                        <Text fontSize={13} lineHeight={20} color="#626765">
                          {detailPro.pro.district}
                          {detailPro.distanceKm != null ? `　${detailPro.distanceKm.toFixed(1)}km` : ''}
                        </Text>
                      </RNView>
                    ) : null}

                    {/* Price breakdown from request */}
                    {(() => {
                      const services = state.services?.categoryIds ?? []
                      const addons = state.addons ?? []
                      const items = [...services, ...addons]
                      const label = items.join('＋')
                      const price = detailPro?.priceRange.min ?? 0
                      return label ? (
                        <Text fontSize={13} lineHeight={20} color="#4A5A52">
                          {label}
                          {'　'}
                          <Text fontWeight="600" color="#1F2723">${price} TWD 起</Text>
                        </Text>
                      ) : (
                        <Text fontSize={13} lineHeight={20} color="#4A5A52">
                          ${price} – {detailPro?.priceRange.max} TWD
                        </Text>
                      )
                    })()}

                    {/* IG portfolio link */}
                    {detailPro?.pro.igHandle ? (
                      <Pressable
                        onPress={() => Linking.openURL(`https://instagram.com/${detailPro.pro.igHandle}`)}
                        accessibilityRole="link"
                        accessibilityLabel={`@${detailPro.pro.igHandle} Instagram`}
                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' })}
                      >
                        <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <FA6ProIcon name="at" size={13} color="#626765" />
                          <Text fontSize={13} lineHeight={20} color="#626765">@{detailPro.pro.igHandle}</Text>
                        </RNView>
                      </Pressable>
                    ) : null}
                  </RNView>

                  {/* Divider */}
                  <RNView style={{ height: 1, backgroundColor: '#E8E9E9', marginHorizontal: 16, marginTop: 16 }} />

                  {/* Slots */}
                  <RNView style={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
                    <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text fontSize={15} fontWeight="600" lineHeight={22} color="#1F2723">可預約時段</Text>
                      {state.date ? (
                        <Text fontSize={12} lineHeight={20} color="#626765">
                          {state.date === 'now' ? '現在（2小時內）' : state.date}
                        </Text>
                      ) : null}
                    </RNView>
                    <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {detailPro?.slots.map((slot) => {
                        const isSelected = selected?.slotId === slot.id
                        return (
                          <Pressable
                            key={slot.id}
                            onPress={() => { if (detailPro) selectSlot(detailPro, slot) }}
                            accessibilityRole="button"
                            accessibilityLabel={formatSlotTime(slot.startsAt)}
                            style={({ pressed }) => ({
                              backgroundColor: isSelected ? '#1F2723' : '#FFFFFF',
                              borderWidth: 1,
                              borderColor: isSelected ? '#1F2723' : '#D8D9D2',
                              borderRadius: 8,
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text fontSize={13} lineHeight={20} color={isSelected ? '#FBFBF8' : '#1F2723'}>
                              {formatSlotTime(slot.startsAt)}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </RNView>
                  </RNView>
                </ScrollView>
              </RNView>
            </Animated.View>

            {/* ── Bottom CTA ── */}
            <RNView style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: '#E8E9E9', backgroundColor: '#FBFBF8' }}>
              <Pressable
                onPress={handleConfirm}
                disabled={!selected}
                accessibilityRole="button"
                accessibilityLabel="選擇此時段"
                style={({ pressed }) => ({
                  borderRadius: 9999, height: 48, backgroundColor: '#1F2723',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: !selected ? 0.4 : pressed ? 0.75 : 1,
                })}
              >
                <Text fontSize={16} fontWeight="600" color="#FBFBF8">選擇此時段</Text>
              </Pressable>
            </RNView>
          </>
        )}
      </Animated.View>

      {/* ── Request popout modal ── */}
      <Modal visible={showRequest} transparent animationType="slide" onRequestClose={() => setShowRequest(false)}>
        <RNView style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Scrim — behind sheet, tap to dismiss */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            onPress={() => setShowRequest(false)}
          />
          {/* Sheet — plain RNView so ScrollView can scroll freely */}
          <RNView style={{ height: SCREEN_HEIGHT * 0.75, backgroundColor: '#FBFBF8', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16 }}>
            {/* Handle */}
            <RNView style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <RNView style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: '#D8D9D2' }} />
            </RNView>

            {/* Modal header */}
            <RNView style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 }}>
              <RNView style={{ flex: 1 }} />
              <Text fontSize={16} fontWeight="600" color="#1F2723">我的需求</Text>
              <RNView style={{ flex: 1, alignItems: 'flex-end' }}>
                <Pressable
                  onPress={() => setShowRequest(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  accessibilityLabel="關閉"
                >
                  <FA6ProIcon name="xmark" size={18} color="#1F2723" />
                </Pressable>
              </RNView>
            </RNView>

            {/* Request rows */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
              <RNView style={{ backgroundColor: '#F5F4EF', borderRadius: 12, overflow: 'hidden' }}>
                {[
                  state.category ? {
                    icon: 'flower',
                    value: CATEGORY_SHORT[state.category] ?? state.category,
                  } : null,
                  state.location?.label ? { icon: 'location-dot', value: state.location.label } : null,
                  state.date ? { icon: 'calendar', value: state.date === 'now' ? '現在（2小時內）' : formatDateWithDay(state.date) } : null,
                  state.timeBand ? { icon: 'clock', value: TIME_BAND_LABELS[state.timeBand] ?? state.timeBand } : null,
                  state.services?.categoryIds?.length ? { icon: 'list', value: state.services.categoryIds.join('、') } : null,
                  state.services?.styleId ? { icon: 'palette', value: state.services.styleId } : null,
                  state.services?.nailScope ? { icon: 'hand', value: state.services.nailScope } : null,
                  state.services?.treatmentTier ? { icon: 'star', value: state.services.treatmentTier } : null,
                  state.services?.lashDensity ? { icon: 'layer-group', value: state.services.lashDensity } : null,
                  state.services?.fiberTagId ? { icon: 'feather', value: state.services.fiberTagId } : null,
                  state.services?.fillInDays != null ? { icon: 'rotate', value: `${state.services.fillInDays} 天` } : null,
                  state.services?.styleTags?.length ? { icon: 'tags', value: state.services.styleTags.join('、') } : null,
                  state.addons?.length ? { icon: 'circle-plus', value: state.addons.join('、') } : null,
                  state.preferences?.length ? { icon: 'comment-slash', value: state.preferences.join('、') } : null,
                  state.customerNote ? { icon: 'pen', value: state.customerNote } : null,
                  state.refPhotoUrl ? { icon: 'image', value: '__photo__' } : null,
                ].filter(Boolean).map((row, i, arr) => (
                  <RNView
                    key={row!.icon}
                    style={{
                      flexDirection: 'row',
                      alignItems: row!.value === '__photo__' ? 'flex-start' : 'center',
                      gap: 12,
                      paddingLeft: 12,
                      paddingRight: 16,
                      paddingVertical: 13,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      borderBottomColor: '#E8E9E9',
                    }}
                  >
                    <RNView style={{ width: 32, alignItems: 'center' }}>
                      <FA6ProIcon name={row!.icon} size={15} color="#626765" weight={row!.icon === 'flower' || row!.icon === 'location-dot' ? 'solid' : 'regular'} />
                    </RNView>
                    {row!.value === '__photo__' ? (
                      <Image
                        source={{ uri: state.refPhotoUrl! }}
                        style={{ width: 88, height: 88, borderRadius: 8 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text fontSize={15} color="#1F2723" flex={1} lineHeight={22}>{row!.value}</Text>
                    )}
                  </RNView>
                ))}
              </RNView>
            </ScrollView>

            {/* Edit request CTA */}
            <RNView style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <Pressable
                onPress={handleEditRequest}
                style={({ pressed }) => ({
                  borderRadius: 9999, height: 48, backgroundColor: '#1F2723',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text fontSize={16} fontWeight="600" color="#FBFBF8">修改需求</Text>
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </RNView>
  )
}

// ── Pro result card ──
function ProCard({
  proResult,
  selected,
  onSelectSlot,
  serviceLabel,
  onPress,
  isLiked,
  onHeartToggle,
}: {
  proResult: ProResult
  selected: SelectedSlot | null
  onSelectSlot: (proResult: ProResult, slot: SlotItem) => void
  serviceLabel: string | null
  onPress: (proResult: ProResult) => void
  isLiked: boolean
  onHeartToggle: () => void
}) {
  const locationText = [
    proResult.distanceKm != null ? `${proResult.distanceKm.toFixed(1)}km` : null,
    proResult.pro.district,
  ].filter(Boolean).join('｜')

  return (
    <Pressable onPress={() => onPress(proResult)} accessibilityRole="button">
    <RNView style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      height: 128,
      flexDirection: 'row',
      overflow: 'hidden',
    }}>
      {/* Photo placeholder */}
      <RNView style={{ width: 120, backgroundColor: '#7E334B' }} />

      {/* Content */}
      <RNView style={{ flex: 1, paddingTop: 10, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, gap: 8 }}>

        {/* Row 1: name + star rating + heart */}
        <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text fontSize={18} fontWeight="700" lineHeight={24} color="#1F2723" numberOfLines={1}
            style={{ letterSpacing: -0.36, flexShrink: 1 }}>
            {proResult.pro.displayName}
          </Text>
          <RNView style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 }}>
            <FA6ProIcon name="star" size={10} color="#626765" weight="solid" />
            <Text fontSize={12} lineHeight={16} color="#626765">4.9 (176)</Text>
          </RNView>
          <HeartButton isLiked={isLiked} onToggle={onHeartToggle} size={18} />
        </RNView>

        {/* Row 2: distance + district */}
        {locationText ? (
          <Text fontSize={12} lineHeight={16} color="#1F2723" style={{ opacity: 0.6 }}>
            {locationText}
          </Text>
        ) : null}

        {/* Row 3: service + price */}
        <Text fontSize={12} lineHeight={16} color="#4A5A52">
          {serviceLabel ? `${serviceLabel} ` : ''}
          <Text fontSize={13} fontWeight="500" color="#4A5A52">${proResult.priceRange.min} TWD</Text>
          {' 起'}
        </Text>

        {/* Row 4: time slots */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {proResult.slots.map((slot) => {
            const isSelected = selected?.slotId === slot.id
            return (
              <Pressable
                key={slot.id}
                onPress={() => onSelectSlot(proResult, slot)}
                accessibilityRole="button"
                accessibilityLabel={formatSlotTime(slot.startsAt)}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => ({
                  backgroundColor: isSelected ? '#1F2723' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? '#1F2723' : '#D8D9D2',
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text fontSize={12} lineHeight={16} color={isSelected ? '#FBFBF8' : '#1F2723'} textAlign="center">
                  {formatSlotTime(slot.startsAt)}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </RNView>
    </RNView>
    </Pressable>
  )
}

