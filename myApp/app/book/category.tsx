import { Pressable, Alert } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { FA6ProIcon } from '@/components/FA6ProIcon'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

type CategoryKey = 'nails' | 'lashes' | 'makeup'

const CATEGORIES: {
  key: CategoryKey
  label: string
  subtitle: string
  icon: string
  disabled?: boolean
  badge?: string
}[] = [
  { key: 'nails', label: '美甲', subtitle: '凝膠、卸甲、修補、保養', icon: 'hand-sparkles' },
  { key: 'lashes', label: '美睫', subtitle: '嫁接、卸睫、睫毛管理', icon: 'eye' },
  { key: 'makeup', label: '美妝', subtitle: '即將推出', icon: 'wand-magic-sparkles', disabled: true, badge: '即將推出' },
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
      <YStack gap={24} marginTop={-52}>
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
                backgroundColor={isSelected ? '#1F2723' : '#FBFBF8'}
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
                  backgroundColor={isSelected ? 'rgba(251,251,248,0.1)' : 'rgba(31,39,35,0.06)'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <FA6ProIcon
                    name={cat.icon}
                    size={22}
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
                        backgroundColor="#F9583B"
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
                    color={isSelected ? 'rgba(251,251,248,0.7)' : '#858279'}
                  >
                    {cat.subtitle}
                  </Text>
                </YStack>
                <FA6ProIcon
                  name="chevron-right"
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
