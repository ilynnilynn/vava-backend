// components/account/RoleToggle.tsx
import { Switch, View as RNView } from 'react-native'
import { XStack, YStack, Text } from 'tamagui'
import { useRole } from '@/lib/role-context'

export const TOGGLE_HEIGHT = 60

export function RoleToggle({ headerHeight }: { headerHeight: number }) {
  const { activeRole, setActiveRole } = useRole()
  const isProMode = activeRole === 'pro'

  return (
    <RNView
      style={{
        position: 'absolute',
        top: headerHeight - TOGGLE_HEIGHT / 2,
        left: 16,
        right: 16,
        zIndex: 10,
        height: TOGGLE_HEIGHT,
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e8e6dc',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        paddingHorizontal: 16,
        justifyContent: 'center',
      }}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <YStack>
          <Text fontSize={12} color="#87867f" lineHeight={16}>
            Using Vava as
          </Text>
          <Text fontSize={15} fontWeight="700" color="#1F2723" lineHeight={22}>
            {isProMode ? '設計師' : '顧客'}
          </Text>
        </YStack>
        <Switch
          value={isProMode}
          onValueChange={(val) => setActiveRole(val ? 'pro' : 'customer')}
          trackColor={{ false: '#b0aea5', true: '#c96442' }}
          thumbColor="#ffffff"
        />
      </XStack>
    </RNView>
  )
}
