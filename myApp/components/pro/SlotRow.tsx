// components/pro/SlotRow.tsx
import { Pressable, StyleSheet } from 'react-native'
import { XStack, Text } from 'tamagui'
import type { SlotItem, SlotState } from '@/types/pro'

const STATE_CONFIG: Record<SlotState, { bg: string; border: string; text: string; label: string }> = {
  expired:   { bg: '#f0f0f0', border: 'transparent', text: '#bbb',     label: '過期' },
  available: { bg: '#fff',    border: '#ddd',         text: '#666',     label: '+ 點擊開放' },
  open:      { bg: '#ede9fe', border: '#c4b5fd',      text: '#7c3aed',  label: '開放中 · 移除' },
  booked:    { bg: '#dcfce7', border: '#86efac',      text: '#15803d',  label: '已預約 🔒' },
}

type Props = {
  slot: SlotItem
  onToggle: (startsAt: string) => void
}

export function SlotRow({ slot, onToggle }: Props) {
  const config = STATE_CONFIG[slot.state]
  const isLocked = slot.state === 'expired' || slot.state === 'booked'

  const timeLabel = new Date(slot.starts_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <XStack alignItems="center" gap={8} marginBottom={5}>
      <Text style={styles.timeLabel}>{timeLabel}</Text>
      <Pressable
        onPress={() => !isLocked && onToggle(slot.starts_at)}
        disabled={isLocked}
        accessibilityLabel={`${timeLabel} ${config.label}`}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: config.bg, borderColor: config.border, opacity: pressed && !isLocked ? 0.75 : 1 },
        ]}
      >
        <Text fontSize={11} color={config.text}>{config.label}</Text>
      </Pressable>
    </XStack>
  )
}

const styles = StyleSheet.create({
  timeLabel: {
    width: 40,
    fontSize: 11,
    color: '#888',
    flexShrink: 0,
  },
  pill: {
    flex: 1,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
