// app/booking/rate.tsx — Customer rates a completed booking
import { useState, useCallback } from 'react'
import { Pressable, ActivityIndicator, Alert, TextInput, StyleSheet } from 'react-native'
import { YStack, XStack, Text, ScrollView, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { AppIcon } from '@/components/AppIcon'
import { submitMobileRating, getExistingRating } from '@/lib/ratings-api'

export default function RateBookingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { bookingId, proId, proName } = useLocalSearchParams<{
    bookingId: string
    proId: string
    proName: string
  }>()

  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)
  const [existingStars, setExistingStars] = useState(0)
  const [existingComment, setExistingComment] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      if (!bookingId) return
      getExistingRating(bookingId)
        .then((existing) => {
          if (existing) {
            setAlreadyRated(true)
            setExistingStars(existing.stars)
            setExistingComment(existing.comment)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [bookingId])
  )

  async function handleSubmit() {
    if (stars === 0 || submitting || !bookingId || !proId) return
    setSubmitting(true)

    try {
      await submitMobileRating({
        bookingId,
        proId,
        stars: stars as 1 | 2 | 3 | 4 | 5,
        comment: comment.trim() || null,
      })
      setSuccess(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '提交失敗'
      Alert.alert('錯誤', msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FBFBF8">
        <ActivityIndicator size="large" color="#1F2723" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} backgroundColor="#FBFBF8">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        height={insets.top + 48}
        alignItems="center"
        paddingHorizontal={12}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <AppIcon name="back" size={20} color="#1F2723" />
        </Pressable>
        <View flex={1} alignItems="center">
          <Text fontSize={16} fontWeight="600" color="#1F2723">評價</Text>
        </View>
        <View width={44} />
      </XStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pro name */}
        <YStack alignItems="center" marginTop={32} marginBottom={24}>
          <Text fontSize={20} fontWeight="700" lineHeight={28} color="#1F2723">
            {proName ?? '設計師'}
          </Text>
          <Text fontSize={14} lineHeight={20} color="#8F9391" marginTop={4}>
            {alreadyRated ? '您已完成評價' : '為您的服務體驗評分'}
          </Text>
        </YStack>

        {/* Already rated — show result */}
        {alreadyRated && (
          <YStack
            backgroundColor="#F0EDE5"
            borderRadius={12}
            padding={24}
            alignItems="center"
            gap={12}
          >
            <XStack gap={4}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Text
                  key={s}
                  fontSize={30}
                  lineHeight={38}
                  color={s <= existingStars ? '#E8A838' : '#E8E9E9'}
                >
                  ★
                </Text>
              ))}
            </XStack>
            {existingComment && (
              <Text
                fontSize={15}
                lineHeight={22}
                color="#1F2723"
                textAlign="center"
              >
                「{existingComment}」
              </Text>
            )}
            <Text fontSize={13} color="#8F9391" marginTop={4}>
              感謝您的評價
            </Text>
          </YStack>
        )}

        {/* Success screen */}
        {success && !alreadyRated && (
          <YStack alignItems="center" marginTop={24} gap={16}>
            <View
              width={64}
              height={64}
              borderRadius={32}
              backgroundColor="#E8FAF2"
              alignItems="center"
              justifyContent="center"
            >
              <AppIcon name="check" size={28} color="#33CC87" />
            </View>
            <Text fontSize={18} fontWeight="700" lineHeight={26} color="#1F2723">
              感謝您的評價！
            </Text>
            <Text fontSize={14} lineHeight={20} color="#8F9391" textAlign="center">
              您的回饋將幫助其他顧客找到優秀的設計師
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="返回預約"
              style={({ pressed }) => ({
                borderRadius: 9999,
                height: 48,
                width: '100%',
                backgroundColor: '#1F2723',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
                marginTop: 8,
              })}
            >
              <Text fontSize={16} fontWeight="600" color="#FBFBF8">返回預約</Text>
            </Pressable>
          </YStack>
        )}

        {/* Rating form */}
        {!alreadyRated && !success && (
          <YStack gap={24}>
            {/* Stars */}
            <YStack gap={8}>
              <Text fontSize={14} fontWeight="600" lineHeight={20} color="#1F2723">
                服務評分
              </Text>
              <XStack gap={8} justifyContent="center" paddingVertical={8}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStars(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s} 顆星`}
                    style={({ pressed }) => ({
                      padding: 4,
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                    })}
                  >
                    <Text
                      fontSize={36}
                      color={s <= stars ? '#E8A838' : '#E8E9E9'}
                    >
                      ★
                    </Text>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            {/* Comment */}
            <YStack gap={8}>
              <Text fontSize={14} fontWeight="600" lineHeight={20} color="#1F2723">
                留言（選填）
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="分享您的體驗..."
                placeholderTextColor="#AEADA6"
                multiline
                maxLength={500}
                style={styles.commentInput}
              />
              <Text fontSize={12} color="#8F9391" textAlign="right">
                {comment.length}/500
              </Text>
            </YStack>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={stars === 0 || submitting}
              accessibilityRole="button"
              accessibilityLabel="提交評價"
              style={({ pressed }) => ({
                borderRadius: 9999,
                height: 52,
                backgroundColor: '#1F2723',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: stars === 0 || submitting ? 0.4 : pressed ? 0.75 : 1,
              })}
            >
              {submitting
                ? <ActivityIndicator color="#FBFBF8" />
                : <Text fontSize={16} fontWeight="600" color="#FBFBF8">提交評價</Text>
              }
            </Pressable>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E9E9',
    padding: 16,
    fontSize: 15,
    color: '#1F2723',
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
})
