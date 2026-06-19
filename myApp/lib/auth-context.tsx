// lib/auth-context.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { User, Pro } from '@/types/database'
import { deriveProStatus, type ProStatus } from './derive-pro-status'
export type { ProStatus } from './derive-pro-status'
export { deriveProStatus } from './derive-pro-status'

type AuthContextType = {
  session: Session | null
  isLoading: boolean
  user: User | null            // users table row
  pro: Pro | null              // pros table row (null if not a pro)
  onboardingComplete: boolean  // users.display_name IS NOT NULL
  proStatus: ProStatus         // derived from pro row
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>  // re-fetch users+pros after onboarding writes
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  user: null,
  pro: null,
  onboardingComplete: false,
  proStatus: 'none',
  signOut: async () => {},
  refreshUser: async () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [pro, setPro] = useState<Pro | null>(null)

  async function fetchUserData(userId: string) {
    const [{ data: userData }, { data: proData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('pros').select('*').eq('user_id', userId).maybeSingle(),
    ])
    setUser(userData ?? null)
    setPro(proData ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        // Mark loading so login.tsx waits for user data before routing
        setIsLoading(true)
        fetchUserData(session.user.id).finally(() => setIsLoading(false))
      } else {
        setUser(null)
        setPro(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshUser() {
    const { data: { session: current } } = await supabase.auth.getSession()
    if (current?.user) await fetchUserData(current.user.id)
  }

  const onboardingComplete = !!user?.display_name && !!user?.phone && !!user?.birthday && !!user?.gender
  const proStatus = deriveProStatus(pro)

  return (
    <AuthContext.Provider value={{ session, isLoading, user, pro, onboardingComplete, proStatus, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}
