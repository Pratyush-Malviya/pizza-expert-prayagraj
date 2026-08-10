import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAbandonedCartRecoveryEmail } from '@/lib/utils/resend'

export async function GET() {
  try {
    const supabase = await createClient()

    // 30 minutes ago timestamp threshold
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    // Query unrecovered carts older than 30 mins
    const { data: idleCarts, error } = await supabase
      .from('cart_sessions')
      .select('*, profile:profiles(email)')
      .eq('recovered', false)
      .lt('last_updated', thirtyMinsAgo)
      .limit(20)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const processed = []

    for (const cart of idleCarts || []) {
      const itemsCount = Array.isArray(cart.items) ? cart.items.length : 1
      const userEmail = cart.profile?.email

      if (userEmail) {
        await sendAbandonedCartRecoveryEmail(userEmail, itemsCount)
          .catch(err => console.warn('Abandoned cart email note:', err))
      }

      // Log notification entry
      await supabase.from('notification_logs').insert({
        user_id: cart.user_id,
        channel: 'email',
        template: 'abandoned_cart',
        status: 'sent',
      })

      // Mark cart as processed/notified
      await supabase
        .from('cart_sessions')
        .update({ recovered: true })
        .eq('id', cart.id)

      processed.push({
        cartId: cart.id,
        itemCount: Array.isArray(cart.items) ? cart.items.length : 0,
        recoveryCoupon: 'COMEBACK5',
      })
    }

    return NextResponse.json({
      success: true,
      processedCount: processed.length,
      processedCarts: processed,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Cron execution failed' }, { status: 500 })
  }
}
