// app/account/contact.tsx  — "聯絡我們" (Contact Us) page
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Svg, { Path, Rect, Circle } from 'react-native-svg'
import { AppIcon } from '@/components/AppIcon'
import { SettingsRow } from '@/components/account/SettingsRow'

const EMAIL = 'hello@vava.now'
const INSTAGRAM = 'vava.now'

async function openExternal(url: string) {
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('無法開啟連結', url)
    }
  } catch {
    Alert.alert('開啟連結失敗', '請稍後再試')
  }
}

export default function ContactScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <YStack paddingTop={insets.top} paddingBottom={0.5}>
        <XStack height={48} alignItems="center" paddingHorizontal={20}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <AppIcon name="back" size={20} color="#1F2723" />
          </Pressable>
          <Text flex={1} fontSize={16} fontWeight="700" color="#1F2723" textAlign="center">
            聯絡我們
          </Text>
          <View style={{ width: 44 }} />
        </XStack>
      </YStack>

      <YStack paddingTop={12}>
        <View style={styles.card}>
          <SettingsRow
            label="Email"
            iconName="email"
            rightText={EMAIL}
            showChevron={false}
            onPress={() => openExternal(`mailto:${EMAIL}`)}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="Instagram"
            customIcon={
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1F2723" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={2} y={2} width={20} height={20} rx={5} />
                <Circle cx={12} cy={12} r={5} />
                <Circle cx={17.5} cy={6.5} r={1} fill="#1F2723" stroke="none" />
              </Svg>
            }
            rightText={`@${INSTAGRAM}`}
            showChevron={false}
            onPress={() => openExternal(`https://www.instagram.com/${INSTAGRAM}/`)}
          />
        </View>

        {/* ── Report a Bug CTA ── */}
        <YStack paddingTop={32} gap={28}>
          <XStack alignItems="center" paddingHorizontal={16}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E8E9E9' }} />
            <Text fontSize={14} color="#787D7B" paddingHorizontal={12}>
              使用上遇到問題了嗎？讓我們知道
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E8E9E9' }} />
          </XStack>
          <YStack paddingHorizontal={20}>
            <Pressable
              onPress={() => router.push('/account/report-bug')}
              style={({ pressed }) => [styles.reportButton, { opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
            >
              <AppIcon name="bug" size={18} color="#FBFBF8" />
              <Text fontSize={16} fontWeight="600" color="#FBFBF8" marginLeft={8}>
                回報問題
              </Text>
            </Pressable>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E9E9',
    marginHorizontal: 14,
  },
  reportButton: {
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#1F2723',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
