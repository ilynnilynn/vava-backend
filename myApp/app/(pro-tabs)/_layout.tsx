// app/(pro-tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { FloatingTabBar } from '@/components/floating-tab-bar'

const PRO_ICONS: Record<string, string> = {
  index: 'house',
  slots: 'calendar-days',
  bookings: 'calendar',
  account: 'user',
}

const PRO_LABELS: Record<string, string> = {
  index: '首頁',
  slots: '時段',
  bookings: '預約',
  account: '帳號',
}

export default function ProTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => (
        <FloatingTabBar {...props} iconNames={PRO_ICONS} labels={PRO_LABELS} />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="slots" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="account" />
    </Tabs>
  )
}
