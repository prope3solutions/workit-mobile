import PostHog from 'posthog-react-native'
import type { PostHogEventProperties } from '@posthog/core'

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export const posthog = posthogKey
  ? new PostHog(posthogKey, {
      host: posthogHost,
      captureAppLifecycleEvents: true,
      enableSessionReplay: false,
    })
  : null

export function initializeTelemetry() {
  if (sentryDsn) {
    console.warn('Sentry is configured but deferred until a signed development or production build is available.')
  }
}

export function identifyTelemetryUser(user: { id: string; role: string }) {
  posthog?.identify(user.id, { role: user.role })
}

export function resetTelemetryUser() {
  posthog?.reset()
}

export function captureTelemetryError(error: unknown, context: { feature: string; event: string }) {
  if (sentryDsn && !__DEV__) console.error('[Sentry deferred]', context, error)
}

export function captureTelemetryEvent(name: string, properties?: PostHogEventProperties) {
  posthog?.capture(name, properties)
}
