import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { colors } from '@/lib/theme/colors'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { hasSeenOnboarding } from '@/lib/onboarding'

export default function Index() {
  const { session, user, role, isLoading } = useAuth()
  const [gymOnboardingRoute, setGymOnboardingRoute] = useState<string | null>()
  const [trainerOnboardingRoute, setTrainerOnboardingRoute] = useState<string | null>()
  // undefined = still checking, true/false = resolved
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | undefined>()

  useEffect(() => {
    hasSeenOnboarding().then(setSeenOnboarding)
  }, [])

  useEffect(() => {
    if (role !== 'gym_admin' || !user) return
    supabase
      .from('gym_admins')
      .select('gym_id, gyms(setup_gym_details, setup_equipment, setup_plans, setup_trainers, setup_payout, setup_submitted)')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          logger.error('auth', 'checkGymOnboarding', error)
          setGymOnboardingRoute(null)
          return
        }
        const gym = data?.gyms as any
        if (!gym) {
          setGymOnboardingRoute('/(gym-onboarding)/gym-details')
        } else if (!gym.setup_equipment) {
          setGymOnboardingRoute('/(gym-onboarding)/equipment')
        } else if (!gym.setup_plans) {
          setGymOnboardingRoute('/(gym-onboarding)/plans')
        } else if (!gym.setup_trainers) {
          setGymOnboardingRoute('/(gym-onboarding)/trainers')
        } else if (!gym.setup_payout) {
          setGymOnboardingRoute('/(gym-onboarding)/payout')
        } else if (!gym.setup_submitted) {
          setGymOnboardingRoute('/(gym-onboarding)/review')
        } else {
          setGymOnboardingRoute(null)
        }
      })
  }, [role, user])

  useEffect(() => {
    if (role !== 'trainer' || !user) return
    supabase
      .from('trainer_profiles')
      .select('id, status, setup_basic_info, setup_professional_info, setup_certifications, setup_bio, setup_pricing, setup_availability, setup_service_type, setup_gyms, setup_identity, setup_submitted')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: trainer, error }) => {
        if (error) {
          logger.error('auth', 'checkTrainerOnboarding', error)
          setTrainerOnboardingRoute(null)
          return
        }
        if (!trainer) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/basic-info')
        } else if (!trainer.setup_basic_info) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/basic-info')
        } else if (!trainer.setup_professional_info) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/professional-info')
        } else if (!trainer.setup_certifications) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/certifications')
        } else if (!trainer.setup_bio) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/bio')
        } else if (!trainer.setup_pricing) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/pricing')
        } else if (!trainer.setup_availability) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/availability')
        } else if (!trainer.setup_service_type) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/service-type')
        } else if (!trainer.setup_gyms) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/preferred-gyms')
        } else if (!trainer.setup_identity) {
          setTrainerOnboardingRoute('/(trainer-onboarding)/identity')
        } else {
          // Submitted (pending/approved/paused) — go to dashboard, it shows the right state
          setTrainerOnboardingRoute(null)
        }
      })
  }, [role, user])

  if (
    isLoading ||
    seenOnboarding === undefined ||
    (role === 'gym_admin' && gymOnboardingRoute === undefined) ||
    (role === 'trainer' && trainerOnboardingRoute === undefined)
  ) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.obsidian }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    )
  }

  // No session at all → truly logged out.
  if (!session) {
    // First-time visitors get the splash + onboarding intro; returning
    // (but logged-out) users go straight to login.
    return <Redirect href={seenOnboarding ? '/(auth)/login' : '/(auth)/splash'} />
  }

  // Session exists but the profile row hasn't loaded yet — hold on the
  // spinner rather than flashing the login/onboarding screens.
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.obsidian }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    )
  }

  switch (role) {
    case 'member':
      return <Redirect href="/(member)" />
    case 'gym_admin':
      return <Redirect href={(gymOnboardingRoute ?? '/(gym-admin)') as any} />
    case 'trainer':
      return <Redirect href={(trainerOnboardingRoute ?? '/(trainer)') as any} />
    case 'super_admin':
      return <Redirect href={'/(super-admin)' as any} />
    default:
      // Authenticated but no role yet — send to role selection
      return <Redirect href="/(auth)/role-select" />
  }
}
