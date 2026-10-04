export const CHECKIN_RADIUS_METRES = 150

export const MEMBERSHIP_EXPIRY_WARNING_DAYS = 7

export const MARKUP = {
  daily: 0.05,
  weekly: 0.05,
  monthly: 0.08,
  trainer: 0.10,
} as const

// Platform commission % retained on every membership payment via Paystack split.
// On a Paystack subaccount, `percentage_charge` = the % the MAIN (platform) account
// receives; the gym's subaccount gets the remainder. So this value goes straight in
// as the subaccount's percentage_charge, and gym_payout = amount - (amount * this%).
export const PLATFORM_FEE_PCT = 10

export const PLAN_DURATIONS = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] as const

export type PlanDuration = typeof PLAN_DURATIONS[number]
