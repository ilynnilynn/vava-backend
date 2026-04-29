// app/(onboarding)/pro/id-photo.tsx
import { useState } from 'react'
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'

export default function ProIdPhotoScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  async function handleNext() {
    if (!imageUri || !session) return
    setUploading(true)

    const path = `${session.user.id}/id.jpg`
    const response = await fetch(imageUri)
    const blob = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('id-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

    setUploading(false)

    if (uploadError) {
      Alert.alert('上傳失敗', uploadError.message)
      return
    }

    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, id_photo_path: path }))

    router.push('/(onboarding)/pro/submitted' as never)
  }

  return (
    <OnboardingStepLayout
      title="上傳身份證件"
      subtitle="用於身份驗證，不會公開顯示"
      step={6}
      totalSteps={6}
      onNext={handleNext}
      nextLabel={uploading ? '上傳中...' : '提交申請'}
      nextDisabled={!imageUri || uploading}
    >
      <Pressable onPress={pickImage} style={styles.picker} accessibilityRole="button">
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <AppIcon name="image" size={32} color="#AEADA6" />
            <Text fontSize={15} color="#AEADA6" marginTop={12}>點擊選擇圖片</Text>
          </View>
        )}
      </Pressable>
    </OnboardingStepLayout>
  )
}

const styles = StyleSheet.create({
  picker: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F4EF',
  },
  preview: { width: '100%', height: '100%' },
})
