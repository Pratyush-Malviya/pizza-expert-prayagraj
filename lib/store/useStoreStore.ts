import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StoreLocation {
  id: string
  name: string
}

interface StoreState {
  activeStoreId: string | null
  availableStores: StoreLocation[]
  setActiveStore: (id: string | null) => void
  setAvailableStores: (stores: StoreLocation[]) => void
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set) => ({
      activeStoreId: null,
      availableStores: [],
      setActiveStore: (id) => set({ activeStoreId: id }),
      setAvailableStores: (stores) => set({ availableStores: stores }),
    }),
    {
      name: 'pizza-expert-store-context',
    }
  )
)
