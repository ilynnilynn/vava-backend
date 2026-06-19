import { useState, useMemo } from 'react'
import { YStack, XStack, Text, ScrollView } from 'tamagui'
import { useRouter } from 'expo-router'

import { StepLayout } from '@/components/booking/StepLayout'
import { SelectionChip } from '@/components/booking/SelectionChip'
import { SectionExpander } from '@/components/booking/SectionExpander'
import { useBookingRequest } from '@/lib/booking-context'

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const

type TimeBand = 'morning' | 'afternoon' | 'evening' | 'any'

const TIME_BANDS: { key: TimeBand; label: string; endsAt: number }[] = [
  { key: 'morning',   label: '早上（9–12 時）',  endsAt: 12 },
  { key: 'afternoon', label: '下午（12–17 時）', endsAt: 17 },
  { key: 'evening',   label: '傍晚（17–22 時）', endsAt: 22 },
  { key: 'any',       label: '不限時段',          endsAt: 24 },
]

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatSubtitle(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function buildDateOptions(): { key: string; label: string; subtitle?: string }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const dayAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
  return [
    { key: 'now', label: '現在', subtitle: '2小時內' },
    { key: formatDateKey(today), label: '今天', subtitle: formatSubtitle(today) },
    { key: formatDateKey(tomorrow), label: '明天', subtitle: formatSubtitle(tomorrow) },
    { key: formatDateKey(dayAfter), label: DAY_NAMES[dayAfter.getDay()], subtitle: formatSubtitle(dayAfter) },
  ]
}

export default function WhenScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const dateOptions = useMemo(() => buildDateOptions(), [])

  const [selectedDate, setSelectedDate] = useState<string | null>(state.date)
  const [selectedTimeBand, setSelectedTimeBand] = useState<TimeBand | null>(state.timeBand)

  const isNow = selectedDate === 'now'
  const showTimeBands = selectedDate !== null && !isNow

  const todayKey = useMemo(() => formatDateKey(new Date()), [])
  const currentHour = new Date().getHours()

  function isTimeBandDisabled(tb: typeof TIME_BANDS[number]): boolean {
    return selectedDate === todayKey && currentHour >= tb.endsAt
  }

  function handleConfirm() {
    dispatch({
      type: 'SET_WHEN',
      payload: {
        date: selectedDate,
        timeBand: isNow ? null : selectedTimeBand,
      },
    })
    router.push('/book/service')
  }

  const canProceed = selectedDate !== null && (isNow || selectedTimeBand !== null)

  return (
    <StepLayout
      title="什麼時候方便？"
      subtitle="選一個你希望的時段"
      currentStep={3}
      totalSteps={6}
      onNext={handleConfirm}
      nextDisabled={!canProceed}
      noScroll
    >
      <YStack flex={1} gap={24} paddingTop={16}>
        {/* Date selection */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            日期
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <XStack gap={8}>
              {dateOptions.map((opt) => (
                <SelectionChip
                  key={opt.key}
                  label={opt.label}
                  subtitle={opt.subtitle}
                  selected={selectedDate === opt.key}
                  borderRadius={15}
                  onPress={() => {
                    setSelectedDate(opt.key)
                    if (opt.key === 'now') {
                      setSelectedTimeBand(null)
                    } else if (opt.key === todayKey && selectedTimeBand) {
                      const tb = TIME_BANDS.find(t => t.key === selectedTimeBand)
                      if (tb && currentHour >= tb.endsAt) setSelectedTimeBand(null)
                    }
                  }}
                />
              ))}
            </XStack>
          </ScrollView>
        </YStack>

        {/* Time band selection — hidden when "現在" */}
        <SectionExpander visible={showTimeBands}>
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              時段
            </Text>
            <XStack flexWrap="wrap" gap={8}>
              {TIME_BANDS.map((tb) => {
                const disabled = isTimeBandDisabled(tb)
                return (
                  <SelectionChip
                    key={tb.key}
                    label={tb.label}
                    selected={selectedTimeBand === tb.key && !disabled}
                    disabled={disabled}
                    onPress={() => setSelectedTimeBand(tb.key)}
                  />
                )
              })}
            </XStack>
          </YStack>
        </SectionExpander>

        {/* Hint when "now" selected */}
        {isNow && (
          <Text fontSize={13} color="#787D7B">
            選擇「現在」表示你希望在 2 小時內開始服務
          </Text>
        )}
      </YStack>
    </StepLayout>
  )
}
