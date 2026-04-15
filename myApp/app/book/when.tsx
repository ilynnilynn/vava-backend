import { useState, useMemo } from 'react'
import { YStack, XStack, Text, ScrollView } from 'tamagui'
import { useRouter } from 'expo-router'

import { StepLayout } from '@/components/booking/StepLayout'
import { SelectionChip } from '@/components/booking/SelectionChip'
import { SectionExpander } from '@/components/booking/SectionExpander'
import { useBookingRequest } from '@/lib/booking-context'

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const

type TimeBand = 'morning' | 'afternoon' | 'evening' | 'any'

const TIME_BANDS: { key: TimeBand; label: string }[] = [
  { key: 'morning', label: '🌅 早上 (9-12)' },
  { key: 'afternoon', label: '☀️ 下午 (12-17)' },
  { key: 'evening', label: '🌆 傍晚 (17-22)' },
  { key: 'any', label: '不限時段' },
]

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildDateOptions(): { key: string; label: string }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const options: { key: string; label: string }[] = [
    { key: 'now', label: '現在' },
    { key: formatDateKey(today), label: '今天' },
  ]
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const label = i === 1 ? '明天' : DAY_NAMES[d.getDay()]
    options.push({ key: formatDateKey(d), label })
  }
  return options
}

export default function WhenScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()

  const dateOptions = useMemo(() => buildDateOptions(), [])

  const [selectedDate, setSelectedDate] = useState<string | null>(state.date)
  const [selectedTimeBand, setSelectedTimeBand] = useState<TimeBand | null>(state.timeBand)

  const isNow = selectedDate === 'now'
  const showTimeBands = selectedDate !== null && !isNow

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
      title="選擇時間"
      currentStep={3}
      totalSteps={6}
      onNext={handleConfirm}
      nextDisabled={!canProceed}
    >
      <YStack gap={24} paddingTop={8}>
        {/* Date selection */}
        <YStack gap={12}>
          <Text fontSize={16} fontWeight="700" color="#1F2723">
            日期
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {dateOptions.map((opt) => (
              <SelectionChip
                key={opt.key}
                label={opt.label}
                selected={selectedDate === opt.key}
                onPress={() => {
                  setSelectedDate(opt.key)
                  if (opt.key === 'now') {
                    setSelectedTimeBand(null)
                  }
                }}
              />
            ))}
          </ScrollView>
        </YStack>

        {/* Time band selection — hidden when "現在" */}
        <SectionExpander visible={showTimeBands}>
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="700" color="#1F2723">
              時段
            </Text>
            <XStack flexWrap="wrap" gap={8}>
              {TIME_BANDS.map((tb) => (
                <SelectionChip
                  key={tb.key}
                  label={tb.label}
                  selected={selectedTimeBand === tb.key}
                  onPress={() => setSelectedTimeBand(tb.key)}
                />
              ))}
            </XStack>
          </YStack>
        </SectionExpander>

        {/* Hint when "now" selected */}
        {isNow && (
          <Text fontSize={13} color="#808868">
            選擇「現在」表示你希望在 1 小時內開始服務
          </Text>
        )}
      </YStack>
    </StepLayout>
  )
}
