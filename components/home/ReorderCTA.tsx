import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RotateCcw, Clock, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export default async function ReorderCTA() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch their most recent completed order
  const { data: lastOrder } = await supabase
    .from('orders')
    .select('id, total, items_summary, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastOrder) return null

  return (
    <div className="bg-[#FEF2F2] border-y border-[#FECACA] py-4 shadow-inner">
      <div className="container-custom flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#B91C1C] shadow-sm">
            <RotateCcw size={20} />
          </div>
          <div>
            <h3 className="font-bold text-[#991B1B] text-sm">Welcome back! Reorder your last meal?</h3>
            <p className="text-xs text-[#B91C1C] flex items-center gap-1.5 mt-0.5 font-medium">
              <Clock size={12} /> Ordered {new Date(lastOrder.created_at).toLocaleDateString()}
              <span className="opacity-60 px-1">•</span>
              <span className="truncate max-w-[200px] sm:max-w-xs">{lastOrder.items_summary}</span>
            </p>
          </div>
        </div>

        <Link
          href={`/checkout?reorder=${lastOrder.id}`} // We can handle this logic later if needed, for now just go to menu or populate cart
          className="btn bg-[#B91C1C] hover:bg-[#991B1B] text-white px-5 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 flex-shrink-0"
        >
          {formatPrice(lastOrder.total)} – Reorder Now <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
