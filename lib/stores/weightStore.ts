import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Each completed gym session nudges the member this much closer to the goal.
// Purely motivational — capped so the bar never claims "done" on its own.
const PROGRESS_PER_SESSION = 0.03
const MAX_ILLUSION_PROGRESS = 0.9

interface WeightState {
  currentWeight: number | null
  dreamWeight: number | null
  sessionsCompleted: number
  setGoal: (current: number, dream: number) => void
  completeSession: () => void
  clearGoal: () => void
}

export const useWeightStore = create<WeightState>()(
  persist(
    (set) => ({
      currentWeight: null,
      dreamWeight: null,
      sessionsCompleted: 0,
      setGoal: (currentWeight, dreamWeight) =>
        set({ currentWeight, dreamWeight, sessionsCompleted: 0 }),
      completeSession: () =>
        set((s) => ({ sessionsCompleted: s.sessionsCompleted + 1 })),
      clearGoal: () =>
        set({ currentWeight: null, dreamWeight: null, sessionsCompleted: 0 }),
    }),
    {
      name: 'workit-weight-goal',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

export function goalProgress(sessionsCompleted: number) {
  return Math.min(sessionsCompleted * PROGRESS_PER_SESSION, MAX_ILLUSION_PROGRESS)
}

export function estimatedWeight(current: number, dream: number, sessionsCompleted: number) {
  const p = goalProgress(sessionsCompleted)
  return Math.round((current + (dream - current) * p) * 10) / 10
}
