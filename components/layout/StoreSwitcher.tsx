'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStoreStore } from '@/lib/store/useStoreStore'
import { Store, ChevronDown } from 'lucide-react'

export default function StoreSwitcher() {
  const supabase = createClient()
  const { activeStoreId, availableStores, setActiveStore, setAvailableStores } = useStoreStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStores() {
      try {
        const { data: stores, error } = await supabase
          .from('stores')
          .select('id, name')
          .eq('active', true)

        if (stores && !error && stores.length > 0) {
          setAvailableStores(stores)
          
          // Auto-select first store if none selected
          if (!activeStoreId) {
            setActiveStore(stores[0].id)
          }
        }
      } catch (err) {
        // Table may not yet exist in Supabase; silently handle
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
