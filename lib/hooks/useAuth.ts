import { useEffect } from 'react'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/authStore'
import { logger } from '@/lib/logger'
import type { UserRole } from '@/types/database'
import { identifyTelemetryUser, resetTelemetryUser } from '@/lib/telemetry'

const USER_ROLES: UserRole[] = ['member', 'gym_admin', 'trainer', 'super_admin']

export function useAuth() {
  const { session, user, role, isLoading, setSession, setUser, setLoading, clear } =
    useAuthStore()

  useEffect(() => {
    // onAuthStateChange is the single source of truth.
    // It fires immediately with the current session on mount,
    // so we don't need a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          resetTelemetryUser()
          clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, nickname, phone, role, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      if (data && USER_ROLES.includes(data.role as UserRole)) {
        setUser({ ...data, role: data.role as UserRole })
        identifyTelemetryUser({ id: data.id, role: data.role })
      } else {
        throw new Error('Your account profile has an invalid role.')
      }
    } catch (err) {
      logger.error('auth', 'fetchUserProfile', err)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
      resetTelemetryUser()
      clear()
      router.replace('/(auth)/login')
    } catch (err) {
      logger.error('auth', 'signOut', err)
    }
  }

  return { session, user, role, isLoading, signOut }
}
