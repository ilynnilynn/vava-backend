// components/account/ProfileHeader.tsx
import { Pressable, View as RNView } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'

const AVATAR_ICONS = ['avatarDaffodil', 'avatarTulip', 'avatarOlive', 'avatarWheat', 'avatarPretzel'] as const

// Each entry: background + icon colour pairing
const AVATAR_PALETTE = [
  { bg: '#C0E8BA', fg: '#353C38' },  // mint
  { bg: '#8FD3D1', fg: '#353C38' },  // teal
  { bg: '#8DC2E6', fg: '#353C38' },  // sky
  { bg: '#A8AFFF', fg: '#353C38' },  // periwinkle
  { bg: '#CDB5FF', fg: '#353C38' },  // lavender
  { bg: '#F98486', fg: '#353C38' },  // pink
  { bg: '#FD6B59', fg: '#353C38' },  // coral
  { bg: '#FFA46E', fg: '#353C38' },  // peach
  { bg: '#DFF5AD', fg: '#353C38' },  // lime
]

// Deterministic pick from `seed` so the avatar stays stable across renders
function getAvatarStyle(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  const n = Math.abs(h)
  return {
    icon: AVATAR_ICONS[n % AVATAR_ICONS.length],
    ...AVATAR_PALETTE[(n >>> 4) % AVATAR_PALETTE.length],
  }
}

type Props = {
  displayName: string
  email?: string
  hasUnread?: boolean
}

export function ProfileHeader({ displayName, email, hasUnread = false }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const avatar = getAvatarStyle(displayName)

  return (
    <YStack
      backgroundColor="#FBFBF8"
      paddingTop={insets.top + 16}
      paddingHorizontal={20}
      paddingBottom={20}
    >
      <XStack alignItems="center" justifyContent="space-between">
        {/* Left: Avatar + Name */}
        <XStack alignItems="center" gap={14} flex={1} minWidth={0}>
          <View
            width={64}
            height={64}
            borderRadius={32}
            backgroundColor={avatar.bg}
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <AppIcon name={avatar.icon} size={26} color={avatar.fg} />
          </View>

          <YStack gap={4} flex={1} minWidth={0}>
            <Text
              fontSize={22}
              fontWeight="700"
              color="#1F2723"
              lineHeight={28}
              numberOfLines={2}
            >
              {displayName}
            </Text>
            {email ? (
              <Text
                fontSize={12}
                color="#8F9391"
                lineHeight={16}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {email}
              </Text>
            ) : (
              <XStack alignItems="center" gap={4}>
                <AppIcon name="rating" size={11} color="#1F2723" />
                <Text fontSize={12} color="#1F2723" lineHeight={16}>
                  4.8
                </Text>
              </XStack>
            )}
          </YStack>
        </XStack>

        {/* Right: Notification bell */}
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="通知"
          style={{ paddingHorizontal: 8 }}
        >
          <RNView style={{ width: 24, height: 24 }}>
            <AppIcon name="notification" size={22} color="#1F2723" weight="regular" />
            {hasUnread && (
              <RNView
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#FF5A3C',
                }}
              />
            )}
          </RNView>
        </Pressable>
      </XStack>
    </YStack>
  )
}
