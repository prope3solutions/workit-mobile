export const logger = {
  info: (feature: string, event: string, data?: object) => {
    if (__DEV__) {
      console.log(`[INFO] [${feature}] [${event}]`, data ?? '')
    }
  },
  warn: (feature: string, event: string, data?: object) => {
    if (__DEV__) {
      console.warn(`[WARN] [${feature}] [${event}]`, data ?? '')
    }
  },
  error: (feature: string, event: string, error: unknown) => {
    console.error(`[ERROR] [${feature}] [${event}]`, error)
    captureTelemetryError(error, { feature, event })
  },
}
import { captureTelemetryError } from '@/lib/telemetry'
