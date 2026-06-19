import { Text, View } from 'tamagui'
import type { BookingStatus } from '@/types/database'

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; color: string }> = {
  confirmed:          { label: '已確認',     bg: '#E8F5E9', color: '#2E7D52' },
  reschedule_pending: { label: '改期中',     bg: '#FFF8E1', color: '#F57F17' },
  completed:          { label: '已完成',     bg: '#E8E9E9', color: '#8F9391' },
  cancelled_grace:    { label: '已取消',     bg: '#FFEBEE', color: '#C62828' },
  cancelled_customer: { label: '已取消',     bg: '#FFEBEE', color: '#C62828' },
  cancelled_pro:      { label: '已取消',     bg: '#FFEBEE', color: '#C62828' },
  no_show_customer:   { label: '未到場',     bg: '#FFEBEE', color: '#C62828' },
  no_show_pro:        { label: '設計師未到', bg: '#FFEBEE', color: '#C62828' },
  rescheduled:        { label: '已改期',     bg: '#E8E9E9', color: '#8F9391' },
  expired:            { label: '已過期',     bg: '#E8E9E9', color: '#8F9391' },
}

type Props = {
  status: BookingStatus
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <View
      backgroundColor={config.bg}
      borderRadius={9999}
      paddingHorizontal={8}
      paddingVertical={2}
      alignSelf="flex-start"
    >
      <Text fontSize={12} fontWeight="600" color={config.color}>
        {config.label}
      </Text>
    </View>
  )
}
