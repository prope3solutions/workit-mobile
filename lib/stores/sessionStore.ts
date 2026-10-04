import { create } from 'zustand'

type SessionStatus = 'idle' | 'in' | 'out'

interface SessionState {
  status: SessionStatus
  checkInTime: Date | null
  elapsed: number
  sessionDuration: string
  setStatus: (s: SessionStatus) => void
  setCheckInTime: (d: Date | null) => void
  setElapsed: (n: number | ((prev: number) => number)) => void
  setSessionDuration: (s: string) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'idle',
  checkInTime: null,
  elapsed: 0,
  sessionDuration: '',
  setStatus: (status) => set({ status }),
  setCheckInTime: (checkInTime) => set({ checkInTime }),
  setElapsed: (n) =>
    set((state) => ({ elapsed: typeof n === 'function' ? n(state.elapsed) : n })),
  setSessionDuration: (sessionDuration) => set({ sessionDuration }),
  reset: () => set({ status: 'idle', checkInTime: null, elapsed: 0, sessionDuration: '' }),
}))
