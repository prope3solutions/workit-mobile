import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/lib/stores/authStore'

export interface Membership {
  id: string
  gymId: string
  gymName: string
  gymLatitude: number | null
  gymLongitude: number | null
  planId: string | null
  planName: string
  /** Raw DB status. May lag reality (e.g. still 'active' past end_date). */
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  /** Derived status for display — 'expired' once end_date passes, regardless
   *  of the raw status. This is the single source of truth for UI pills. */
  displayStatus: 'active' | 'cancelled' | 'expired'
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  amountPaidNaira: number
  /** Whole days remaining until end_date (>= 0). */
  daysLeft: number
  /** Cancelled but the paid period hasn't ended yet — still has access. */
  inGrace: boolean
  /** True while the member can still use the gym (active, or cancelled-in-grace). */
  hasAccess: boolean
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function mapRow(row: any): Membership {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(row.end_date + 'T00:00:00')

  const notExpiredByDate = end >= today
  // A membership grants access if it's active, or cancelled but still inside
  // the paid period (access-until-period-end model).
  const inGrace = row.status === 'cancelled' && notExpiredByDate
  const hasAccess = (row.status === 'active' || inGrace) && notExpiredByDate

  // Derived display status: end_date passing wins over the raw status.
  const displayStatus: 'active' | 'cancelled' | 'expired' =
    !notExpiredByDate ? 'expired'
    : row.status === 'cancelled' ? 'cancelled'
    : row.status === 'expired' ? 'expired'
    : 'active'

  const plan = row.membership_plans as { id: string; name: string } | null
  const gym = row.gyms as {
    id: string
    name: string
    latitude: number | null
    longitude: number | null
  } | null

  return {
    id: row.id,
    gymId: row.gym_id,
    gymName: gym?.name ?? 'Your gym',
    gymLatitude: gym?.latitude ?? null,
    gymLongitude: gym?.longitude ?? null,
    planId: row.plan_id,
    planName: plan?.name ?? 'Membership',
    status: row.status,
    displayStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    amountPaidNaira: row.amount_paid_naira ?? 0,
    daysLeft: daysBetween(today, end),
    inGrace,
    hasAccess,
  }
}

/**
 * The member's current membership. Returns the most relevant one:
 * an active/cancelled-in-grace membership if any, else the latest row.
 * `null` membership means the member is in the "no membership" state.
 */
export function useMembership() {
  const user = useAuthStore((s) => s.user)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setMembership(null)
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from('memberships')
        .select('id, gym_id, plan_id, status, start_date, end_date, amount_paid_naira, membership_plans(id, name), gyms(id, name, latitude, longitude)')
        .eq('member_id', user.id)
        .order('end_date', { ascending: false })
      if (qErr) throw qErr

      const rows = (data ?? []).map(mapRow)
      // Prefer a membership the member still has access to; otherwise the newest.
      const current = rows.find((m) => m.hasAccess) ?? rows[0] ?? null
      setMembership(current)
    } catch (err) {
      logger.error('membership', 'useMembership', err)
      setError('Could not load your membership.')
      setMembership(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { membership, loading, error, refetch: load }
}
