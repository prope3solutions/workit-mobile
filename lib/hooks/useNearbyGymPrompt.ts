import { useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { getDistanceMetres } from '@/lib/utils/distance'
import type { Membership } from '@/lib/hooks/useMembership'

const PROMPT_RADIUS_METRES = 250

/**
 * Suggests a session when a member is near their gym. This is deliberately
 * foreground-only and opt-in at the prompt: proximity never checks a member
 * in or starts a session without an explicit tap.
 */
export function useNearbyGymPrompt(membership: Membership | null) {
  const promptedForGym = useRef<string | null>(null)

  useEffect(() => {
    if (!membership?.hasAccess || membership.gymLatitude == null || membership.gymLongitude == null) return
    const activeMembership = membership
    let cancelled = false

    async function check() {
      const permission = await Location.getForegroundPermissionsAsync()
      if (permission.status !== Location.PermissionStatus.GRANTED) return
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (cancelled) return
      const distance = getDistanceMetres(current.coords.latitude, current.coords.longitude, activeMembership.gymLatitude!, activeMembership.gymLongitude!)
      if (distance > PROMPT_RADIUS_METRES || promptedForGym.current === activeMembership.gymId) return
      promptedForGym.current = activeMembership.gymId

      const notificationPermission = await Notifications.getPermissionsAsync()
      if (notificationPermission.status === Notifications.PermissionStatus.GRANTED) {
        await Notifications.scheduleNotificationAsync({
          content: { title: `Near ${activeMembership.gymName}`, body: 'Ready to start your workout session?' },
          trigger: null,
        })
      }
      Alert.alert(`You’re near ${activeMembership.gymName}`, 'Would you like to open check-in?', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open check-in', onPress: () => router.push('/(member)/checkin' as any) },
      ])
    }

    check().catch(() => undefined)
    const timer = setInterval(() => check().catch(() => undefined), 60_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [membership?.gymId, membership?.gymLatitude, membership?.gymLongitude, membership?.hasAccess, membership?.gymName])
}
