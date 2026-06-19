import { Pressable, Alert } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

type CategoryKey = 'nails' | 'lashes' | 'makeup'

const CATEGORIES: {
  key: CategoryKey
  label: string
  subtitle: string
  icon: AppIconName
  disabled?: boolean
  badge?: string
}[] = [
  { key: 'nails', label: '美甲', subtitle: '凝膠、卸甲、修補、保養', icon: 'serviceNails' },
  { key: 'lashes', label: '美睫', subtitle: '嫁接、卸睫、睫毛管理', icon: 'serviceLashes' },
  { key: 'makeup', label: '美妝', subtitle: '即將推出', icon: 'serviceMakeup', disabled: true, badge: '即將推出' },
]

export default function CategoryScreen() {
  const router = useRouter()
  const { state, dispatch } = useBookingRequest()
  const prefilled = state.category !== null

  function handleSelect(key: CategoryKey) {
    if (key === 'makeup') {
      Alert.alert('即將推出', '美妝服務即將上線，敬請期待！')
      return
    }
    dispatch({ type: 'SET_CATEGORY', payload: key })
    router.push('/book/location')
  }

  return (
    <StepLayout
      title="想預約什麼服務？"
      subtitle={prefilled ? '已選擇此服務，你也可以更改服務' : '點選一個你需要的服務'}
      currentStep={1}
      totalSteps={6}
      hideBack
    >
      <YStack gap={24} flex={1} justifyContent="center">
        {CATEGORIES.map((cat) => {
          const isSelected = state.category === cat.key
          return (
            <Pressable
              key={cat.key}
              onPress={() => handleSelect(cat.key)}
              accessibilityRole="button"
              accessibilityLabel={cat.label + (cat.disabled ? '（即將推出）' : '')}
              accessibilityState={{ selected: state.category === cat.key, disabled: !!cat.disabled }}
              style={({ pressed }) => ({ opacity: cat.disabled ? 0.5 : pressed ? 0.75 : 1 })}
            >
              <XStack
                backgroundColor={isSelected ? '#1F2723' : '#F3F0EA'}
                borderRadius={8}
                height={100}
                paddingHorizontal={20}
                alignItems="center"
                gap={16}
              >
                {/* Hand-drawn style icon */}
                <View
                  width={48}
                  height={48}
                  borderRadius={12}
                  alignItems="center"
                  justifyContent="center"
                >
                  <AppIcon
                    name={cat.icon}
                    size={24}
                    color={isSelected ? '#FBFBF8' : '#1F2723'}
                  />
                </View>
                <YStack gap={4} flex={1}>
                  <XStack alignItems="center" gap={8}>
                    <Text
                      fontSize={20}
                      fontWeight="700"
                      color={isSelected ? '#FBFBF8' : '#1F2723'}
                    >
                      {cat.label}
                    </Text>
                    {cat.badge && (
                      <View
                        backgroundColor="#FF5A3C"
                        borderRadius={5}
                        paddingHorizontal={6}
                        paddingVertical={2}
                      >
                        <Text fontSize={12} fontWeight="600" color="#FBFBF8">
                          {cat.badge}
                        </Text>
                      </View>
                    )}
                  </XStack>
                  <Text
                    fontSize={13}
                    color={isSelected ? 'rgba(251,251,248,0.7)' : '#787D7B'}
                  >
                    {cat.subtitle}
                  </Text>
                </YStack>
                <AppIcon
                  name="forward"
                  size={16}
                  color={isSelected ? 'rgba(251,251,248,0.4)' : 'rgba(31,39,35,0.4)'}
                />
              </XStack>
            </Pressable>
          )
        })}
      </YStack>
    </StepLayout>
  )
}
