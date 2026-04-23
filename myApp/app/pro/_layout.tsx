// app/pro/_layout.tsx
import { Stack } from 'expo-router'

export default function ProLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="services" />
    </Stack>
  )
}
