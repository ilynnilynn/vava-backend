// app/account/report-bug.tsx
import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth-context'
import { AppIcon } from '@/components/AppIcon'

const FLOW_OPTIONS = [
  '註冊 / 登入',
  '預約流程',
  '配對',
  '預約詳情',
  '設計師申請',
  '設計師排班',
  '帳號 / 個人資料',
  '通知',
  '其他',
] as const

type UploadState = 'idle' | 'uploading' | 'done' | 'error'
type ScreenState = 'form' | 'submitting' | 'success'

export default function ReportBugScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session } = useSession()

  const [screenState, setScreenState] = useState<ScreenState>('form')
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  // Screenshot
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const canSubmit = selectedFlow && description.trim().length > 0 && uploadState !== 'uploading'

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

    if (!session) return
    setUploadState('uploading')

    const path = `${session.user.id}/${Date.now()}.jpg`
    const response = await fetch(uri)
    const blob = await response.blob()

    const { error } = await supabase.storage
      .from('bug-screenshots')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

    if (error) {
      setUploadState('error')
      setUploadError(error.message)
      return
    }

    setUploadedPath(path)
    setUploadState('done')
  }

  function removeImage() {
    setImageUri(null)
    setUploadedPath(null)
    setUploadState('idle')
    setUploadError(null)
  }

  async function handleSubmit() {
    if (!session || !selectedFlow || !description.trim()) return
    setScreenState('submitting')

    const { error } = await supabase.from('bug_reports').insert({
      user_id: session.user.id,
      flow: selectedFlow,
      description: description.trim(),
      screenshot_path: uploadedPath,
    })

    if (error) {
      setScreenState('form')
      setUploadError(error.message)
      return
    }

    setScreenState('success')
  }

  // ── Success state ──
  if (screenState === 'success') {
    return (
      <YStack flex={1} backgroundColor="#FBFBF8">
        <XStack
          paddingTop={insets.top + 16}
          paddingHorizontal={20}
          paddingBottom={12}
          alignItems="center"
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="返回"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
          >
            <AppIcon name="back" size={20} color="#1F2723" />
          </Pressable>
          <Text fontSize={16} fontWeight="700" color="#1F2723" flex={1}>回報問題</Text>
        </XStack>

        <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal={40}>
          <View style={styles.successIcon}>
            <AppIcon name="success" size={36} color="#33CC87" />
          </View>
          <Text fontSize={18} fontWeight="700" color="#1F2723" marginTop={20} textAlign="center">
            感謝回報 — 我們會盡快處理。
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
          >
            <Text fontSize={15} fontWeight="600" color="#FBFBF8">返回</Text>
          </Pressable>
        </YStack>
      </YStack>
    )
  }

  // ── Form state ──
  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal={20}
        paddingBottom={12}
        alignItems="center"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="返回"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <Text fontSize={16} fontWeight="700" color="#1F2723" flex={1}>回報問題</Text>
      </XStack>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Screenshot ── */}
          <Text style={styles.label}>截圖（選填）</Text>
          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              {uploadState === 'uploading' && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#FBFBF8" size="large" />
                </View>
              )}
              <Pressable
                onPress={removeImage}
                style={styles.removeButton}
                accessibilityLabel="移除截圖"
              >
                <AppIcon name="close" size={14} color="#FBFBF8" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickImage} style={styles.picker} accessibilityRole="button">
              <View style={styles.pickerInner}>
                <AppIcon name="image" size={32} color="#AEADA6" />
                <Text fontSize={14} color="#AEADA6" marginTop={10}>點擊上傳截圖</Text>
              </View>
            </Pressable>
          )}
          {uploadState === 'error' && (
            <Text fontSize={13} color="#CC3352" marginTop={8}>
              上傳失敗：{uploadError}
            </Text>
          )}

          {/* ── Flow selector ── */}
          <Text style={[styles.label, { marginTop: 24 }]}>問題發生在哪裡？</Text>
          <View style={styles.chipContainer}>
            {FLOW_OPTIONS.map((flow) => {
              const isSelected = selectedFlow === flow
              return (
                <Pressable
                  key={flow}
                  onPress={() => setSelectedFlow(flow)}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    fontSize={14}
                    lineHeight={20}
                    color={isSelected ? '#FBFBF8' : '#1F2723'}
                  >
                    {flow}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* ── Description ── */}
          <Text style={[styles.label, { marginTop: 24 }]}>描述問題</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="告訴我們發生了什麼問題、你預期的結果，以及重現步驟。"
            placeholderTextColor="#AEADA6"
            textAlignVertical="top"
          />

          {/* ── Submit ── */}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || screenState === 'submitting'}
            style={({ pressed }) => [
              styles.submitButton,
              { opacity: !canSubmit || screenState === 'submitting' ? 0.4 : pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
          >
            {screenState === 'submitting' ? (
              <ActivityIndicator color="#FBFBF8" />
            ) : (
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">送出回報</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2723',
    marginBottom: 10,
  },
  // Screenshot
  picker: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E9E9',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  pickerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F4EF',
  },
  previewContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Chips
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  chipSelected: {
    backgroundColor: '#1F2723',
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E8E9E9',
  },
  // Text area
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E9E9',
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2723',
  },
  // Submit
  submitButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 9999,
    backgroundColor: '#1F2723',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Success
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8FAF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 9999,
    backgroundColor: '#1F2723',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
