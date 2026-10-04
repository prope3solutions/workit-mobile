import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Activity = {
  id: string
  name: string
  duration: string   // e.g. "45 min"
  durationMins: number
  sets?: number
  reps?: number
  weightKg?: number
  category: string
  trainingArea?: 'Upper A' | 'Lower A' | 'Upper B' | 'Lower B'
  notes?: string
  completed?: boolean
}

interface ActivityStore {
  activities: Record<string, Activity[]>   // dateKey → Activity[]
  addActivities: (dateKey: string, items: Activity[]) => void
  deleteActivity: (dateKey: string, id: string) => void
  clearDay: (dateKey: string) => void
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set) => ({
      activities: {},

      addActivities: (dateKey, items) =>
        set(state => ({
          activities: {
            ...state.activities,
            [dateKey]: [
              ...(state.activities[dateKey] ?? []),
              ...items,
            ],
          },
        })),

      deleteActivity: (dateKey, id) =>
        set(state => ({
          activities: {
            ...state.activities,
            [dateKey]: (state.activities[dateKey] ?? []).filter(a => a.id !== id),
          },
        })),

      clearDay: (dateKey) =>
        set(state => {
          const next = { ...state.activities }
          delete next[dateKey]
          return { activities: next }
        }),
    }),
    {
      name: 'workit-activities',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
