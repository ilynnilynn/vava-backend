// app/(onboarding)/pro/id-photo.tsx
import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { AppIcon } from '@/components/AppIcon'

const DRAFT_KEY = '@vava/proWizardDraft'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export default function ProIdPhotoScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    const uri = result.assets[0].uri
    setImageUri(uri)
    setUploadedPath(null)
    setUploadError(null)

    // Upload immediately — submit button stays disabled until this resolves
    if (!session) return
    setUploadState('uploading')

    try {
      const path = `${session.user.id}/id.jpg`

      // Read file as base64 then decode to ArrayBuffer — avoids the known
      // React Native issue where fetch(file://).blob() produces empty/corrupt data
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const { error } = await supabase.storage
        .from('id-photos')
        .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true })

      if (error) {
        console.error('[id-photo] upload failed:', error)
        setUploadState('error')
        setUploadError(error.message)
        Alert.alert('上傳失敗', '請稍後再試或選擇其他圖片。')
        return
      }

      setUploadedPath(path)
      setUploadState('done')
    } catch (e) {
      console.error('[id-photo] unexpected upload error:', e)
      setUploadState('error')
      setUploadError(e instanceof Error ? e.message : '未知錯誤')
      Alert.alert('上傳失敗', '讀取圖片時發生錯誤，請重試。')
    }
  }

  // id_photo_path is only written to the draft after upload is confirmed
  async function handleNext() {
    if (!uploadedPath) return

    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    const current = raw ? JSON.parse(raw) : {}
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, id_photo_path: uploadedPath }))

    router.push('/(onboarding)/pro/submitted' as never)
  }

  const nextLabel =
    uploadState === 'uploading' ? '上傳中...' :
    uploadState === 'done'      ? '提交申請' :
                                  '提交申請'

  return (
    <OnboardingStepLayout
      title="上傳身份證件"
      subtitle="用於身份驗證，不會公開顯示"
      step={7}
      totalSteps={7}
      onNext={handleNext}
      nextLabel={nextLabel}
      nextDisabled={uploadState !== 'done'}
    >
      <Pressable
        onPress={pickImage}
        style={styles.picker}
        accessibilityRole="button"
        disabled={uploadState === 'uploading'}
      >
        {imageUri ? (
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            {uploadState === 'uploading' && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#FBFBF8" size="large" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <AppIcon name="image" size={32} color="#AEADA6" />
            <Text fontSize={15} color="#AEADA6" marginTop={12}>點擊選擇圖片</Text>
          </View>
        )}
      </Pressable>

      {uploadState === 'done' && (
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>✓ 上傳成功</Text>
        </View>
      )}

      {uploadState === 'error' && (
        <Text fontSize={13} color="#CC3352" marginTop={10} textAlign="center">
          上傳失敗：{uploadError}。請點擊圖片重新選擇。
        </Text>
      )}
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
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8FAF2',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  successBadgeText: { fontSize: 14, fontWeight: '600', color: '#2DB276' },
})
