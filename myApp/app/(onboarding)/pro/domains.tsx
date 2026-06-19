// app/(onboarding)/pro/domains.tsx
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'
import type { AppIconName } from '@/constants/iconMap'

const DRAFT_KEY = '@vava/proWizardDraft'
const MAX_SELECTIONS = 3

type Category = {
  value: string
  label: string
  icon: AppIconName
  comingSoon: boolean
}

const CATEGORIES: Category[] = [
  { value: 'nails',  label: '美甲', icon: 'serviceNails',  comingSoon: false },
  { value: 'lashes', label: '美睫', icon: 'serviceLashes', comingSoon: false },
  { value: 'makeup', label: '美妝', icon: 'serviceMakeup', comingSoon: true  },
  { value: 'brows',  label: '眉毛', icon: 'scissors',      comingSoon: true  },
]

export default function ProDomainsScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value)
      if (prev.length >= MAX_SELECTIONS) return prev
      return [...prev, value]
    })
  }

  async function handleNext() {
    if (!selected.length) return
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, domains: selected }))
    router.push('/(onboarding)/pro/location' as never)
  }

  return (
    <OnboardingStepLayout
      title="你提供哪些服務？"
      subtitle="可複選，最多 3 項"
      step={1}
      totalSteps={7}
      onNext={handleNext}
      nextDisabled={selected.length === 0}
    >
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.row}>
          {CATEGORIES.slice(0, 2).map((cat) => (
            <CategoryCard
              key={cat.value}
              cat={cat}
              orderNum={selected.indexOf(cat.value) + 1}
              onPress={() => toggle(cat.value)}
            />
          ))}
        </View>
        {/* Row 2 */}
        <View style={styles.row}>
          {CATEGORIES.slice(2, 4).map((cat) => (
            <CategoryCard
              key={cat.value}
              cat={cat}
              orderNum={0}
              onPress={() => {}}
            />
          ))}
        </View>
      </View>
    </OnboardingStepLayout>
  )
}

function CategoryCard({
  cat,
  orderNum,
  onPress,
}: {
  cat: Category
  orderNum: number   // 1-indexed selection order; 0 = not selected
  onPress: () => void
}) {
  const isSelected = orderNum > 0

  return (
    <Pressable
      onPress={onPress}
      disabled={cat.comingSoon}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected, disabled: cat.comingSoon }}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        cat.comingSoon && styles.cardDisabled,
      ]}
    >
      {/* Selection order badge — top-right inside card */}
      {isSelected && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{orderNum}</Text>
        </View>
      )}

      {/* 即將推出 badge — top-right inside card */}
      {cat.comingSoon && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>即將推出</Text>
        </View>
      )}

      {/* Icon + label: left-aligned vertical stack */}
      <View style={styles.cardContent}>
        <AppIcon
          name={cat.icon}
          size={22}
          color={cat.comingSoon ? '#AEADA6' : isSelected ? '#1F2723' : '#8F9391'}
        />
        <Text
          fontSize={16}
          fontWeight={isSelected ? '600' : '400'}
          color={cat.comingSoon ? '#AEADA6' : '#1F2723'}
        >
          {cat.label}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row:  { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    backgroundColor: 'transparent',
    paddingLeft: 20,
    paddingTop: 20,
    position: 'relative',
  },
  cardSelected: {
    borderColor: '#1F2723',
    borderWidth: 2,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1F2723',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBFBF8',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F0EDE5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 1,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#AEADA6',
    fontWeight: '500',
  },
})
