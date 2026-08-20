import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ReverseGeocodeResult } from '@/lib/utils/reverseGeocode'

export interface UserLocation {
  lat: number
  lng: number
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  displayName: string
  isGps: boolean
  label?: string
  updatedAt: string
}

interface LocationState {
  currentLocation: UserLocation | null
  isDetecting: boolean
  error: string | null
  
  // Actions
  setLocation: (loc: UserLocation) => void
  setDetecting: (isDetecting: boolean) => void
  setError: (error: string | null) => void
  clearLocation: () => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentLocation: null,
      isDetecting: false,
      error: null,

      setLocation: (loc) => set({ currentLocation: loc, error: null, isDetecting: false }),
      setDetecting: (isDetecting) => set({ isDetecting }),
      setError: (error) => set({ error, isDetecting: false }),
      clearLocation: () => set({ currentLocation: null, error: null, isDetecting: false }),
    }),
    {
      name: 'pizza_expert_user_location',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
