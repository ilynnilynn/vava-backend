import { Pressable, View as RNView } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'
import type { NotificationListItem, NotificationType } from '@/types/notification'

const ICON_CONFIG: Record<NotificationType, { icon: AppIconName; bg: string }> = {
  booking_confirmed: { icon: 'calendarConfirm', bg: '#A8AFFF' },
  booking_changed: { icon: 'time', bg: '#808868' },
  booking_cancelled: { icon: 'calendarCancel', bg: '#FF5A3C' },
  booking_reminder: { icon: 'time', bg: '#DFF5AD' },
  review_prompt: { icon: 'rating', bg: '#ECF0E4' },
  pro_application_declined: { icon: 'user', bg: '#CC3352' },
}

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const d = new Date(isoString)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin}分鐘前`
  if (diffHr < 24) return `${diffHr}小時前`
  if (diffDay < 7) return `${diffDay}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

type Props = {
  notification: NotificationListItem
  onPress?: () => void
}

export function NotificationCard({ notification, onPress }: Props) {
  const config = ICON_CONFIG[notification.type]
  const isUnread = !notification.is_read

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}，${notification.body}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      <XStack paddingVertical={14} paddingHorizontal={20} gap={14} alignItems="center">
        {/* Icon circle */}
        <RNView
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: config.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name={config.icon} size={18} color="#353C38" />
        </RNView>

        {/* Text */}
        <YStack flex={1} gap={3}>
          {/* Title + time — mirrors BookingCard title row */}
          <XStack justifyContent="space-between" alignItems="center">
            {isUnread && (
              <RNView
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#FF5A3C',
                  marginRight: 6,
                }}
              />
            )}
            <Text
              fontSize={15}
              fontWeight={isUnread ? '700' : '400'}
              lineHeight={22}
              color={isUnread ? '#1F2723' : '#4B524F'}
              flex={1}
              marginRight={8}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text fontSize={12} lineHeight={16} color="#A5A8A7">
              {formatRelativeTime(notification.created_at)}
            </Text>
          </XStack>

          {/* Body */}
          <Text
            fontSize={13}
            fontWeight={isUnread ? '500' : '400'}
            lineHeight={18}
            color="#8F9391"
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        </YStack>
      </XStack>
    </Pressable>
  )
}
