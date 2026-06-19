// lib/role-context.tsx
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export type UserRole = 'customer' | 'pro'

type RoleState = {
  enabledRoles: UserRole[]
  activeRole: UserRole
  setActiveRole: (role: UserRole) => Promise<void>
  isRoleLoading: boolean
}

const STORAGE_KEY = '@vava/activeRole'
const USE_MOCK = false

const RoleContext = createContext<RoleState>({
  enabledRoles: ['customer'],
  activeRole: 'customer',
  setActiveRole: async () => {},
  isRoleLoading: true,
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [enabledRoles, setEnabledRoles] = useState<UserRole[]>(['customer'])
  const [activeRole, setActiveRoleState] = useState<UserRole>('customer')
  const [isRoleLoading, setIsRoleLoading] = useState(true)
  const explicitlySet = useRef(false)

  useEffect(() => {
    async function init() {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      const persisted: UserRole = stored === 'pro' ? 'pro' : 'customer'

      if (USE_MOCK) {
        setEnabledRoles(['customer', 'pro'])
        if (!explicitlySet.current) setActiveRoleState(persisted)
        setIsRoleLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      let roles: UserRole[] = ['customer']

      if (session?.user) {
        const { data } = await supabase
          .from('pros')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_approved', true)
          .maybeSingle()
        if (data) roles = ['customer', 'pro']
      }

      setEnabledRoles(roles)
      if (!explicitlySet.current) {
        setActiveRoleState(roles.includes(persisted) ? persisted : 'customer')
      }
      setIsRoleLoading(false)
    }
    init()
  }, [])

  async function setActiveRole(role: UserRole) {
    if (!enabledRoles.includes(role)) return
    explicitlySet.current = true
    setActiveRoleState(role)
    await AsyncStorage.setItem(STORAGE_KEY, role)
  }

  return (
    <RoleContext.Provider value={{ enabledRoles, activeRole, setActiveRole, isRoleLoading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleState {
  return useContext(RoleContext)
}
