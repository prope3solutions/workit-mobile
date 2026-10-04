import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { UserRole } from '@/types/database'

interface AuthUser {
  id: string
  email: string
  full_name: string
  nickname: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
}

interface AuthState {
  session: Session | null
  user: AuthUser | null
  role: UserRole | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user, role: user?.role ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ session: null, user: null, role: null, isLoading: false }),
}))
