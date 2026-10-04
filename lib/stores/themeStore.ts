import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeStore {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'workit-theme', storage: createJSONStorage(() => AsyncStorage) }
  )
)
