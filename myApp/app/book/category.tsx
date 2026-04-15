import { Pressable, Alert } from 'react-native'
import { YStack, XStack, Text, View } from 'tamagui'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'

import { StepLayout } from '@/components/booking/StepLayout'
import { useBookingRequest } from '@/lib/booking-context'

type CategoryKey = 'nails' | 'lashes' | 'makeup'

const CATEGORIES: {
  key: CategoryKey
  label: string
  subtitle: string
  disabled?: boolean
  badge?: string
}[] = [
  { key: 'nails', label: '美甲', subtitle: '凝膠、卸甲、修補、保養' },
  { key: 'lashes', label: '美睫', subtitle: '嫁接、補睫、卸睫' },
  { key: 'makeup', label: '美妝', subtitle: '即將推出', disabled: true, badge: '即將推出' },
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
      title="選擇類別"
      subtitle={prefilled ? '已為你預選類別，你也可以更改' : undefined}
      currentStep={1}
      totalSteps={6}
    >
      <YStack gap={12} paddingTop={8}>
        {CATEGORIES.map((cat) => {
          const isSelected = state.category === cat.key
          return (
            <Pressable
              key={cat.key}
              onPress={() => handleSelect(cat.key)}
              style={{ opacity: cat.disabled ? 0.5 : 1 }}
            >
              <XStack
                backgroundColor={isSelected ? '#1F2723' : '#F0EDE5'}
                borderRadius={8}
                height={100}
                paddingHorizontal={20}
                alignItems="center"
                justifyContent="space-between"
              >
                <YStack gap={4}>
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
                        <Text fontSize={10} fontWeight="600" color="#FBFBF8">
                          {cat.badge}
                        </Text>
                      </View>
                    )}
                  </XStack>
                  <Text
                    fontSize={13}
                    color={isSelected ? 'rgba(251,251,248,0.7)' : '#808868'}
                  >
                    {cat.subtitle}
                  </Text>
                </YStack>
                <ChevronRight
                  size={20}
                  color={isSelected ? '#FBFBF8' : '#1F2723'}
                />
              </XStack>
            </Pressable>
          )
        })}
      </YStack>
    </StepLayout>
  )
}
