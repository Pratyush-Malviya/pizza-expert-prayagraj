import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem, CartItemOption } from '@/types'

interface CartState {
  items: CartItem[]
  isOpen: boolean
  // Actions
  addItem: (item: Omit<CartItem, 'totalPrice'>) => void
  removeItem: (itemKey: string) => void
  updateQuantity: (itemKey: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  // Computed
  getItemCount: () => number
  getSubtotal: () => number
  getItemKey: (id: string, selectedOptions: CartItemOption[]) => string
}

function calculateTotalPrice(
  basePrice: number,
  selectedOptions: CartItemOption[],
  quantity: number
): number {
  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.priceDelta, 0)
  return (basePrice + optionsTotal) * quantity
}

function getItemKey(id: string, selectedOptions: CartItemOption[]): string {
  const optionStr = selectedOptions
    .map((o) => `${o.optionName}:${o.choice}`)
    .sort()
    .join('|')
  return `${id}__${optionStr}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      getItemKey,

      addItem: (item) => {
        const key = getItemKey(item.id, item.selectedOptions)
        set((state) => {
          const existing = state.items.find(
            (i) => getItemKey(i.id, i.selectedOptions) === key
          )

          if (existing) {
            return {
              items: state.items.map((i) => {
                if (getItemKey(i.id, i.selectedOptions) === key) {
                  const newQty = i.quantity + item.quantity
                  return {
                    ...i,
                    quantity: newQty,
                    totalPrice: calculateTotalPrice(i.price, i.selectedOptions, newQty),
                  }
                }
                return i
              }),
            }
          }

          return {
            items: [
              ...state.items,
              {
                ...item,
                totalPrice: calculateTotalPrice(item.price, item.selectedOptions, item.quantity),
              },
            ],
          }
        })
      },

      removeItem: (itemKey) => {
        set((state) => ({
          items: state.items.filter(
            (i) => getItemKey(i.id, i.selectedOptions) !== itemKey
          ),
        }))
      },

      updateQuantity: (itemKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemKey)
          return
        }
        set((state) => ({
          items: state.items.map((i) => {
            if (getItemKey(i.id, i.selectedOptions) === itemKey) {
              return {
                ...i,
                quantity,
                totalPrice: calculateTotalPrice(i.price, i.selectedOptions, quantity),
              }
            }
            return i
          }),
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.totalPrice, 0),
    }),
    {
      name: 'pizza-expert-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
