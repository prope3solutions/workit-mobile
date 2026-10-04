import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useMembership } from '@/lib/hooks/useMembership'
import { logger } from '@/lib/logger'

export interface GymMember {
  memberId: string
  fullName: string
  nickname: string | null
  avatarUrl: string | null
  lastActiveAt: string | null
}

export interface LeaderboardEntry extends GymMember {
  checkinCount: number
  workoutCount: number
}

export function useGymCommunity() {
  const { membership } = useMembership()
  const [members, setMembers] = useState<GymMember[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!membership) {
      setMembers([])
      setLeaderboard([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [membersResult, leaderboardResult] = await Promise.all([
        supabase.rpc('get_gym_members', { p_gym_id: membership.gymId }),
        supabase.rpc('get_gym_leaderboard', { p_gym_id: membership.gymId }),
      ])
      if (membersResult.error) throw membersResult.error
      if (leaderboardResult.error) throw leaderboardResult.error
      setMembers((membersResult.data ?? []).map((row) => ({
        memberId: row.member_id,
        fullName: row.full_name,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        lastActiveAt: row.last_active_at,
      })))
      setLeaderboard((leaderboardResult.data ?? []).map((row) => ({
        memberId: row.member_id,
        fullName: row.full_name,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        lastActiveAt: null,
        checkinCount: Number(row.checkin_count),
        workoutCount: Number(row.workout_count),
      })))
    } catch (cause) {
      logger.error('gym-community', 'load', cause)
      setError('Could not load your gym community.')
    } finally {
      setLoading(false)
    }
  }, [membership])

  useEffect(() => { load() }, [load])

  return { members, leaderboard, loading, error, refetch: load }
}
