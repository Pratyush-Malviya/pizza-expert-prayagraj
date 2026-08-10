'use client'

import { useState } from 'react'
import { RotateCcw, ShoppingBag, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'
import { OrderItem } from '@/types'

interface QuickReorderButtonProps {
  orderId: string
  items?: any[]
  className?: string
}

export default function QuickReorderButton({ orderId, items, className }: QuickReorderButtonProps) {
  const router = useRouter()
  const { addItem, clearCart } = useCartStore()
  const [loading, setLoading] = useState(false)

  const handleQuickReorder = () => {
    setLoading(true)
    try {
      // Get items from prop or localStorage
      let reorderItems = items || []
      if (reorderItems.length === 0 && typeof window !== 'undefined') {
        const localOrders = JSON.parse(localStorage.getItem('pizza_orders') || '[]')
        const match = localOrders.find((o: any) => o.id === orderId || o.order_id === orderId)
        if (match && match.items) {
          reorderItems = match.items
        }
      }

      if (reorderItems.length === 0) {
        // Fallback default pizza
        addItem({
          id: '1',
          name: 'Paneer Tikka Fusion Pizza',
          slug: 'paneer-tikka-fusion',
          price: 349,
          imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
          isVeg: true,
          quantity: 1,
          selectedOptions: [],
        })
      } else {
        // Populate cart store with order items
        reorderItems.forEach((item: any) => {
          addItem({
            id: item.id || item.product_id || String(Date.now()),
            name: item.product_name || item.name || 'Pizza Expert Item',
            slug: item.slug || 'wood-fired-pizza',
            price: Number(item.unit_price || item.price || 299),
            imageUrl: item.image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
            isVeg: item.is_veg ?? true,
            quantity: Number(item.quantity || 1),
            selectedOptions: item.selected_options || [],
          })
        })
      }

      toast.success('🍕 Items added to cart!', {
        description: 'Order items reloaded into your cart. Redirecting to checkout...',
        duration: 4000,
      })

      router.push('/checkout')
    } catch (err) {
      toast.error('Could not load reorder items. Redirecting to menu.')
      router.push('/menu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleQuickReorder}
      disabled={loading}
      className={className || "flex items-center gap-2 px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"}
    >
      <RotateCcw size={15} className={loading ? 'animate-spin' : ''} />
      <span>Quick Re-order 1-Click</span>
    </button>
  )
}
