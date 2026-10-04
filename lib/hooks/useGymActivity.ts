import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useMembership } from '@/lib/hooks/useMembership'
import { logger } from '@/lib/logger'

export interface GymActivityEvent {
  id: string
  eventType: 'check_in' | 'workout_completed' | 'milestone' | 'announcement'
  createdAt: string
  actorName: string
  actorAvatarUrl: string | null
  payload: Record<string, unknown>
}

export function useGymActivity(limit = 8) {
  const { membership } = useMembership()
  const [events, setEvents] = useState<GymActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!membership) {
      setEvents([])
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: queryError } = await supabase
        .from('gym_activity_events')
        .select('id, event_type, created_at, payload, users!gym_activity_events_actor_id_fkey(full_name, avatar_url)')
        .eq('gym_id', membership.gymId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (queryError) throw queryError
      setEvents((data ?? []).map((row) => {
        const actor = row.users as unknown as { full_name: string; avatar_url: string | null } | null
        return {
          id: row.id,
          eventType: row.event_type as GymActivityEvent['eventType'],
          createdAt: row.created_at ?? new Date(0).toISOString(),
          actorName: actor?.full_name ?? 'A gym member',
          actorAvatarUrl: actor?.avatar_url ?? null,
          payload: (row.payload ?? {}) as Record<string, unknown>,
        }
      }))
    } catch (cause) {
      logger.error('gym-activity', 'load', cause)
      setError('Could not load gym activity.')
    } finally {
      setLoading(false)
    }
  }, [limit, membership])

  useEffect(() => { load() }, [load])
  return { events, loading, error, refetch: load }
}
