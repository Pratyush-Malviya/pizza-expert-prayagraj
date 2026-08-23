'use client'

import { useEffect, useState } from 'react'
import { useStoreStore } from '@/lib/store/useStoreStore'
import { Store, ChevronDown } from 'lucide-react'

export default function StoreSwitcher() {
  const { activeStoreId, availableStores, setActiveStore, setAvailableStores } = useStoreStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/stores')
        if (res.ok) {
          const data = await res.json()
          if (data?.stores && Array.isArray(data.stores) && data.stores.length > 0) {
            setAvailableStores(data.stores)
            if (!activeStoreId) {
              setActiveStore(data.stores[0].id)
            }
          }
        }
      } catch {
        // Fallback default
        setAvailableStores([{ id: 'main-prayagraj', name: 'Prayagraj (Main Outlet)' }])
      } finally {
        setLoading(false)
      }
    }

    fetchStores()
  }, [])

  if (loading || availableStores.length === 0) return null

  const activeStore = availableStores.find(s => s.id === activeStoreId) || availableStores[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1C1917] hover:bg-[#F4EFEA] border border-[#E7E0D8] transition-colors"
      >
        <Store size={14} className="text-[#57534E]" />
        <span className="truncate max-w-[120px]">{activeStore?.name || 'Select Store'}</span>
        <ChevronDown size={14} className="text-[#A8A29E]" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 w-48 bg-white border border-[#E7E0D8] rounded-xl shadow-lg py-1 z-50 overflow-hidden">
          {availableStores.map((store) => (
            <button
              key={store.id}
              onClick={() => {
                setActiveStore(store.id)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F4EFEA] transition-colors ${
                activeStoreId === store.id ? 'font-bold text-[#FF3B00]' : 'text-[#1C1917]'
              }`}
            >
              {store.name}
            </button>
          ))}
          
          {availableStores.length > 1 && (
            <div className="border-t border-[#E7E0D8] mt-1 pt-1">
              <button
                onClick={() => {
                  setActiveStore(null)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F4EFEA] transition-colors ${
                  !activeStoreId ? 'font-bold text-[#FF3B00]' : 'text-[#57534E]'
                }`}
              >
                All Stores (Owner View)
              </button>
            </div>
          )}
        </div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
