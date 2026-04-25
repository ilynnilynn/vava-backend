// components/account/ProfileHeader.tsx
import { Alert, Pressable, View as RNView } from 'react-native'
import { XStack, YStack, Text, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FA6ProIcon } from '@/components/FA6ProIcon'

const AVATAR_ICONS = ['flower-daffodil', 'flower-tulip', 'olive', 'wheat', 'pretzel'] as const

// Each entry: background + icon colour pairing
const AVATAR_PALETTE = [
  { bg: '#C0E8BA', fg: '#1F2723' },  // mint
  { bg: '#8FD3D1', fg: '#1F2723' },  // teal
  { bg: '#8DC2E6', fg: '#1F2723' },  // sky
  { bg: '#A8AFFF', fg: '#1F2723' },  // periwinkle
  { bg: '#CDB5FF', fg: '#1F2723' },  // lavender
  { bg: '#F98486', fg: '#1F2723' },  // pink
  { bg: '#FD6B59', fg: '#1F2723' },  // coral
  { bg: '#FFA46E', fg: '#1F2723' },  // peach
  { bg: '#DFF5AD', fg: '#1F2723' },  // lime
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
  hasUnread?: boolean
}

export function ProfileHeader({ displayName, hasUnread = false }: Props) {
  const insets = useSafeAreaInsets()
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
        <XStack alignItems="center" gap={14} flex={1}>
          <View
            width={64}
            height={64}
            borderRadius={32}
            backgroundColor={avatar.bg}
            alignItems="center"
            justifyContent="center"
          >
            <FA6ProIcon name={avatar.icon} size={26} color={avatar.fg} />
          </View>

          <YStack gap={4}>
            <Text fontSize={22} fontWeight="700" color="#1F2723" lineHeight={28}>
              林小美
            </Text>
            <XStack alignItems="center" gap={4}>
              <FA6ProIcon name="star" size={11} color="#1F2723" />
              <Text fontSize={12} color="#1F2723" lineHeight={16}>
                4.8
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Right: Notification bell */}
        <Pressable
          onPress={() => Alert.alert('通知', '通知中心即將推出')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="通知"
        >
          <RNView style={{ width: 24, height: 24 }}>
            <FA6ProIcon name="bell" size={22} color="#787D7B" weight="regular" />
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
                  borderWidth: 1.5,
                  borderColor: '#FBFBF8',
                }}
              />
            )}
          </RNView>
        </Pressable>
      </XStack>
    </YStack>
  )
}
