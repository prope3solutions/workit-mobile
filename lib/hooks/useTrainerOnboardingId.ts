import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useTrainerOnboardingStore } from '@/lib/stores/trainerOnboardingStore'

// Resolves the in-progress trainer id, falling back to a lookup for app relaunches mid-onboarding.
export function useTrainerOnboardingId() {
  const trainerId = useTrainerOnboardingStore((s) => s.trainerId)
  const setTrainerId = useTrainerOnboardingStore((s) => s.setTrainerId)
  const [resolving, setResolving] = useState(!trainerId)

  useEffect(() => {
    if (trainerId) {
      setResolving(false)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setResolving(false)
        return
      }
      supabase
        .from('trainer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) logger.error('trainerOnboarding', 'resolveTrainerId', error)
          if (data?.id) setTrainerId(data.id)
          setResolving(false)
        })
    })
  }, [trainerId])

  return { trainerId, resolving }
}
