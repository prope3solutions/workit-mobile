import { create } from 'zustand'

interface GymOnboardingState {
  gymId: string | null
  setGymId: (id: string) => void
  reset: () => void
}

export const useGymOnboardingStore = create<GymOnboardingState>((set) => ({
  gymId: null,
  setGymId: (gymId) => set({ gymId }),
  reset: () => set({ gymId: null }),
}))
