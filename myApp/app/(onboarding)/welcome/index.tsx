// app/(onboarding)/welcome/index.tsx
// New-user value carousel — 4 pages shown on first launch.
// Communicates VAVA's value proposition and routes to login.
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ValueCarousel, type ValuePage } from '@/components/onboarding/ValueCarousel'
import {
  WelcomeHeroIllustration,
  HowItWorksIllustration,
  QualityTrustIllustration,
  GetStartedIllustration,
} from '@/components/onboarding/ValueIllustrations'

const WELCOME_SEEN_KEY = '@vava/hasSeenWelcome'

export default function WelcomeCarouselScreen() {
  const router = useRouter()

  async function goToLogin() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true')
    router.replace('/(auth)/login' as never)
  }

  const pages: ValuePage[] = [
    {
      id: 'welcome-hero',
      renderIllustration: () => <WelcomeHeroIllustration />,
      headline: '即時預約美容服務',
      body: '美甲、美睫，一鍵搞定。\n找到你附近的專業美容師，立即預約。',
    },
    {
      id: 'how-it-works',
      renderIllustration: () => <HowItWorksIllustration />,
      headline: '三步驟，超簡單',
      body: '搜尋附近美容師、選擇時段、完成預約。\n不需等待，即時確認。',
    },
    {
      id: 'quality-trust',
      renderIllustration: () => <QualityTrustIllustration />,
      headline: '品質與信任',
      body: '每位美容師皆經過認證，\n真實作品集與評價，讓你安心預約。',
    },
    {
      id: 'get-started',
      renderIllustration: () => <GetStartedIllustration />,
      headline: '開始探索',
      body: '美甲、美睫服務，隨時為你準備好。\n立即加入 VAVA，開啟你的美麗旅程。',
      cta: { label: '立即開始', onPress: goToLogin },
    },
  ]

  return <ValueCarousel pages={pages} onSkip={goToLogin} accentColor="#FF5A3C" />
}
