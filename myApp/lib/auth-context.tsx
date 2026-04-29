// lib/auth-context.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { User, Pro } from '@/types/database'

export type ProStatus = 'none' | 'pending' | 'approved'

type AuthContextType = {
  session: Session | null
  isLoading: boolean
  user: User | null            // users table row
  pro: Pro | null              // pros table row (null if not a pro)
  onboardingComplete: boolean  // users.display_name IS NOT NULL
  proStatus: ProStatus         // derived from pro row
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  user: null,
  pro: null,
  onboardingComplete: false,
  proStatus: 'none',
  signOut: async () => {},
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
      console.log('[auth] onAuthStateChange event:', _event, 'hasUser:', !!session?.user)
      setSession(session)
      if (session?.user) {
        // Mark loading so index.tsx waits for user data before routing
        setIsLoading(true)
        fetchUserData(session.user.id).finally(() => {
          console.log('[auth] fetchUserData done, setIsLoading(false)')
          setIsLoading(false)
        })
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

  const onboardingComplete = !!user?.display_name
  const proStatus: ProStatus =
    pro === null ? 'none' : pro.is_approved ? 'approved' : 'pending'

  return (
    <AuthContext.Provider value={{ session, isLoading, user, pro, onboardingComplete, proStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSession() {
  return useContext(AuthContext)
}
