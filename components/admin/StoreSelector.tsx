'use client'

import React, { useState, useEffect } from 'react'
import { Store, ChevronDown, Check, Building2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface StoreItem {
  id: string
  name: string
  address?: string
  code?: string
  active?: boolean
}

const DEFAULT_STORES: StoreItem[] = [
  { id: 'all', name: 'All Locations (Owner View)', address: 'Consolidated View Across Stores' },
  { id: 'store-prayagraj-civil-lines', name: 'Civil Lines Flagship', address: '12 Sardar Patel Marg, Civil Lines, Prayagraj', code: 'PRG-01' },
  { id: 'store-prayagraj-katra', name: 'Katra University Outlet', address: '45 University Road, Katra, Prayagraj', code: 'PRG-02' },
  { id: 'store-prayagraj-naini', name: 'Naini Cloud Kitchen', address: '88 Industrial Area, Naini, Prayagraj', code: 'PRG-03' },
]

export default function StoreSelector({
  selectedStoreId,
  onSelectStore,
}: {
  selectedStoreId?: string
  onSelectStore?: (storeId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [stores, setStores] = useState<StoreItem[]>(DEFAULT_STORES)
  const [activeStoreId, setActiveStoreId] = useState<string>(selectedStoreId || 'all')

  useEffect(() => {
    // Fetch live stores from Supabase if available
    const fetchStores = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('stores').select('id, name, address, active')
        if (data && data.length > 0 && !error) {
          setStores([{ id: 'all', name: 'All Locations (Owner View)', address: 'Consolidated View Across Stores' }, ...data])
        }
      } catch (err) {
        console.warn('Using default store locations list')
      }
    }
    fetchStores()
  }, [])

  const handleSelect = (id: string) => {
    setActiveStoreId(id)
    setIsOpen(false)
    if (onSelectStore) {
      onSelectStore(id)
    } else {
      localStorage.setItem('active_store_id', id)
      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('store-changed', { detail: { storeId: id } }))
    }
  }

  const selectedStore = stores.find((s) => s.id === activeStoreId) || stores[0]

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white hover:bg-black/60 hover:border-red-500/50 transition duration-200"
      >
        <div className="p-1 rounded-lg bg-red-600/20 text-red-400">
          <Building2 size={14} />
        </div>
        <div className="text-left font-medium max-w-[150px] sm:max-w-[200px] truncate">
          <span className="block text-[10px] text-white/50 leading-tight">Active Location</span>
          <span className="truncate block font-semibold">{selectedStore.name}</span>
        </div>
        <ChevronDown size={14} className={`text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-white/15 shadow-2xl z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-white/10 text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center justify-between">
            <span>Select Location</span>
            <span className="text-emerald-400 text-[10px] lowercase font-mono font-normal">multi-store ready</span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {stores.map((store) => {
              const isSelected = store.id === activeStoreId
              return (
                <button
                  key={store.id}
                  onClick={() => handleSelect(store.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition border-b border-white/5 last:border-[0] ${
                    isSelected ? 'bg-red-950/40 text-white' : 'text-white/80'
                  }`}
                >
                  <MapPin size={14} className={`mt-0.5 shrink-0 ${isSelected ? 'text-red-400' : 'text-white/40'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-red-300' : 'text-white'}`}>
                        {store.name}
                      </span>
                      {isSelected && <Check size={14} className="text-red-400 shrink-0 ml-1" />}
                    </div>
                    {store.address && (
                      <span className="text-[10px] text-white/40 truncate block mt-0.5 font-normal">
                        {store.address}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
