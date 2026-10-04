import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/stores/authStore'
import { useMembership } from '@/lib/hooks/useMembership'
import { logger } from '@/lib/logger'
import type { Activity } from '@/lib/stores/activityStore'

export function useWorkoutPlan() {
  const user = useAuthStore((state) => state.user)
  const { membership } = useMembership()
  const [activities, setActivities] = useState<Record<string, Activity[]>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !membership) {
      setActivities({})
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('session_date, workout_exercises(id, name, category, training_area, duration_minutes, sets, reps, weight_kg, calories, notes, display_order)')
        .eq('member_id', user.id)
        .eq('gym_id', membership.gymId)
        .order('session_date', { ascending: false })
      if (error) throw error

      const next: Record<string, Activity[]> = {}
      type WorkoutExerciseRow = {
        id: string
        name: string
        category: string
        training_area: 'Upper A' | 'Lower A' | 'Upper B' | 'Lower B' | null
        duration_minutes: number | null
        sets: number | null
        reps: number | null
        weight_kg: number | null
        notes: string | null
        display_order: number
        completed_at: string | null
      }
      type WorkoutSessionRow = { session_date: string; workout_exercises: WorkoutExerciseRow[] | null }
      for (const session of (data ?? []) as unknown as WorkoutSessionRow[]) {
        const exercises = [...(session.workout_exercises ?? [])].sort((a, b) => a.display_order - b.display_order)
        next[session.session_date] = exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          trainingArea: exercise.training_area ?? undefined,
          duration: `${exercise.duration_minutes ?? 0} min`,
          durationMins: exercise.duration_minutes ?? 0,
          sets: exercise.sets ?? undefined,
          reps: exercise.reps ?? undefined,
          weightKg: exercise.weight_kg ?? undefined,
          notes: exercise.notes ?? undefined,
          completed: Boolean(exercise.completed_at),
        }))
      }
      setActivities(next)
    } catch (error) {
      logger.error('workout', 'load-plan', error)
    } finally {
      setLoading(false)
    }
  }, [membership, user])

  useEffect(() => { load() }, [load])

  const saveActivities = useCallback(async (dateKey: string, items: Activity[]) => {
    if (!user || !membership || items.length === 0) return
    const { error } = await supabase.rpc('save_workout_plan', {
      p_session_date: dateKey,
      p_exercises: items.map((item) => ({
        name: item.name,
        category: item.category,
        training_area: item.trainingArea ?? null,
        duration_minutes: item.durationMins,
        sets: item.sets ?? null,
        reps: item.reps ?? null,
        weight_kg: item.weightKg ?? null,
        notes: item.notes ?? null,
      })),
    })
    if (error) throw error
    await load()
  }, [load, membership, user])

  const toggleExercise = useCallback(async (exerciseId: string, completed: boolean) => {
    const { error } = await supabase.rpc('set_workout_exercise_completion', {
      p_exercise_id: exerciseId,
      p_completed: completed,
    })
    if (error) throw error
    await load()
  }, [load])

  return { activities, loading, saveActivities, toggleExercise, refetch: load }
}
