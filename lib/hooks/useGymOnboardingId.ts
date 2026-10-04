import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useGymOnboardingStore } from '@/lib/stores/gymOnboardingStore'

// Resolves the in-progress gym id, falling back to a lookup for app relaunches mid-onboarding.
export function useGymOnboardingId() {
  const gymId = useGymOnboardingStore((s) => s.gymId)
  const setGymId = useGymOnboardingStore((s) => s.setGymId)
  const [resolving, setResolving] = useState(!gymId)

  useEffect(() => {
    if (gymId) {
      setResolving(false)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setResolving(false)
        return
      }
      supabase
        .from('gym_admins')
        .select('gym_id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) logger.error('gymOnboarding', 'resolveGymId', error)
          if (data?.gym_id) setGymId(data.gym_id)
          setResolving(false)
        })
    })
  }, [gymId])

  return { gymId, resolving }
}
