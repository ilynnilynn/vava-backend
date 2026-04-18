import { Tabs } from 'expo-router'
import React from 'react'

import { FloatingTabBar } from '@/components/floating-tab-bar'

export default function TabLayout() {
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
      <Tabs.Screen
        name="booking"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
