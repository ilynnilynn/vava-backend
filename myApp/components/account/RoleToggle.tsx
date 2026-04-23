// components/account/RoleToggle.tsx
import { View as RNView } from 'react-native'
import { XStack, Text } from 'tamagui'
import { useRouter } from 'expo-router'
import { useRole } from '@/lib/role-context'
import { ModeSwitch } from '@/components/ui/ModeSwitch'

export const TOGGLE_HEIGHT = 56

export function RoleToggle() {
  const { activeRole, setActiveRole } = useRole()
  const router = useRouter()
  const isProMode = activeRole === 'pro'

  async function handleToggle(val: boolean) {
    await setActiveRole(val ? 'pro' : 'customer')
    if (val) {
      router.replace('/(pro-tabs)/')
    } else {
      router.replace('/(tabs)/')
    }
  }

  return (
    <RNView
      style={{
        marginHorizontal: 16,
        marginTop: 0,
        marginBottom: 12,
        height: TOGGLE_HEIGHT,
        backgroundColor: '#F5F5F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
      }}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={15} fontWeight="600" color="#141413" lineHeight={22}>
          {isProMode ? '設計師模式' : '顧客模式'}
        </Text>
        <ModeSwitch value={isProMode} onValueChange={handleToggle} />
      </XStack>
    </RNView>
  )
}
