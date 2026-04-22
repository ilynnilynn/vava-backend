import { Tabs } from 'expo-router'

import { FloatingTabBar } from '@/components/floating-tab-bar'
import { useRole } from '@/lib/role-context'

export default function TabLayout() {
  const { activeRole } = useRole() // subscribes — pro tab set defined in future spec

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  )
}
