import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuthStore } from '@/lib/stores/authStore'

export interface MemberCheckIn {
  id: string
  checkedInAt: string
}

export function useCheckIns(gymId?: string, membershipId?: string) {
  const user = useAuthStore((state) => state.user)
  const [checkIns, setCheckIns] = useState<MemberCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user || !gymId) {
      setCheckIns([])
      setLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: queryError } = await supabase
        .from('checkins')
        .select('id, checked_in_at')
        .eq('member_id', user.id)
        .eq('gym_id', gymId)
        .order('checked_in_at', { ascending: false })
        .limit(20)

      if (queryError) throw queryError
      setCheckIns((data ?? []).map((row) => ({
        id: row.id,
        checkedInAt: row.checked_in_at ?? new Date(0).toISOString(),
      })))
    } catch (cause) {
      logger.error('check-in', 'load-history', cause)
      setError('Could not load your recent check-ins.')
    } finally {
      setLoading(false)
    }
  }, [gymId, user])

  useEffect(() => {
    load()
  }, [load])

  const createCheckIn = useCallback(async () => {
    if (!user || !gymId || !membershipId) throw new Error('Missing member, gym, or membership')

    const { data, error: insertError } = await supabase
      .from('checkins')
      .insert({
        membership_id: membershipId,
        member_id: user.id,
        gym_id: gymId,
        checked_in_by: 'self',
      })
      .select('id, checked_in_at')
      .single()

    if (insertError) throw insertError

    const created = { id: data.id, checkedInAt: data.checked_in_at ?? new Date().toISOString() }
    setCheckIns((current) => [created, ...current].slice(0, 20))
    logger.info('check-in', 'created', { gymId, checkInId: created.id })
    return created
  }, [gymId, membershipId, user])

  return { checkIns, loading, error, refetch: load, createCheckIn }
}
