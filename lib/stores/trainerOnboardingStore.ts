import { create } from 'zustand'

interface TrainerOnboardingState {
  trainerId: string | null
  setTrainerId: (id: string) => void
  reset: () => void
}

export const useTrainerOnboardingStore = create<TrainerOnboardingState>((set) => ({
  trainerId: null,
  setTrainerId: (trainerId) => set({ trainerId }),
  reset: () => set({ trainerId: null }),
}))
