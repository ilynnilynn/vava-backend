// app/account/help-center.tsx  — "關於" (About) page
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { AppIcon } from '@/components/AppIcon'
import { SettingsRow } from '@/components/account/SettingsRow'

const PRIVACY_URL = 'https://vava.now/privacy'
const TERMS_URL = 'https://vava.now/termsandconditions'

const appVersion = Constants.expoConfig?.version ?? '1.0.0'

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

export default function AboutScreen() {
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
            關於
          </Text>
          <View style={{ width: 44 }} />
        </XStack>
      </YStack>

      <YStack paddingTop={12}>
        <View style={styles.card}>
          <SettingsRow
            label="隱私權政策"
            iconName="shieldCheck"
            onPress={() => openExternal(PRIVACY_URL)}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="服務條款"
            iconName="shieldCheck"
            onPress={() => openExternal(TERMS_URL)}
          />
          <View style={styles.divider} />
          <SettingsRow
            label="App 版本"
            iconName="info"
            showChevron={false}
            rightText={appVersion}
          />
        </View>
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
})
