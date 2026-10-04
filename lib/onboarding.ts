import AsyncStorage from '@react-native-async-storage/async-storage'
import { logger } from '@/lib/logger'

const ONBOARDING_SEEN_KEY = 'workit.onboarding.seen.v1'

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
    return v === '1'
  } catch (err) {
    logger.error('onboarding', 'hasSeenOnboarding', err)
    // On read failure, treat as seen so we never trap the user on the intro loop.
    return true
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1')
  } catch (err) {
    logger.error('onboarding', 'markOnboardingSeen', err)
  }
}
