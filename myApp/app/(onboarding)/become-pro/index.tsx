// app/(onboarding)/become-pro/index.tsx
// Become-a-Pro value carousel — 4 pages explaining what it means
// to be a VAVA pro. Accessible from account screen or a "Become a Pro" entry point.
import { useRouter } from 'expo-router'
import { ValueCarousel, type ValuePage } from '@/components/onboarding/ValueCarousel'
import {
  EarnScheduleIllustration,
  GrowBusinessIllustration,
  SimpleFairIllustration,
  JoinVavaIllustration,
} from '@/components/onboarding/ValueIllustrations'

export default function BecomeProCarouselScreen() {
  const router = useRouter()

  function goToProOnboarding() {
    router.push('/(onboarding)/pro/domains' as never)
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/' as never)
    }
  }

  const pages: ValuePage[] = [
    {
      id: 'earn-schedule',
      renderIllustration: () => <EarnScheduleIllustration />,
      headline: '自由安排，自主接單',
      body: '設定你的營業時間，在自己的工作室接待客人。\n你的時間，你做主。',
    },
    {
      id: 'grow-business',
      renderIllustration: () => <GrowBusinessIllustration />,
      headline: '拓展你的事業',
      body: '讓新客人找到你，建立作品集，累積好評。\nVAVA 幫你帶來更多生意。',
    },
    {
      id: 'simple-fair',
      renderIllustration: () => <SimpleFairIllustration />,
      headline: '簡單又公平',
      body: '透明的收費方式，輕鬆管理預約，\n即時收到 LINE 通知，不漏接任何訂單。',
    },
    {
      id: 'join-vava',
      renderIllustration: () => <JoinVavaIllustration />,
      headline: '加入 VAVA 成為美容師',
      body: '只需幾個簡單步驟即可完成註冊。\n立即開始，展現你的專業。',
      cta: { label: '開始註冊', onPress: goToProOnboarding },
    },
  ]

  return <ValueCarousel pages={pages} onSkip={goBack} accentColor="#1F2723" />
}
