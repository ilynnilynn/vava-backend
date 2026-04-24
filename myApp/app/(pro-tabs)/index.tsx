// app/(pro-tabs)/index.tsx
import { Redirect } from 'expo-router'

export default function ProHomeRedirect() {
  return <Redirect href="/(pro-tabs)/slots" />
}
