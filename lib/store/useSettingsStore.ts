import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  logoDataUrl: string | null
  setLogoDataUrl: (url: string | null) => void
  
  businessName: string
  setBusinessName: (name: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      setLogoDataUrl: (url) => set({ logoDataUrl: url }),

      businessName: 'Pizza Expert Prayagraj',
      setBusinessName: (name) => set({ businessName: name }),
    }),
    {
      name: 'pizza-expert-settings', // unique name for localStorage key
    }
  )
)
