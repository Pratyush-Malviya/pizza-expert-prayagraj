import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Cron Execution
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && process.env.NODE_ENV === 'production') {
      const authHeader = req.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 })
      }
    }

    const supabase = await createAdminClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Fetch today's orders
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total, status')
      .gte('created_at', todayStart.toISOString())

    if (error) {
      throw new Error(error.message)
    }

    const totalOrders = orders?.length || 0
    const successfulOrders =
      orders?.filter((o) => o.status === 'delivered' || o.status === 'ready' || o.status === 'out_for_delivery') || []
    const cancelledOrders = orders?.filter((o) => o.status === 'cancelled') || []

    const totalRevenue = successfulOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    const digestPayload = {
      date: new Date().toLocaleDateString('en-IN'),
      totalOrders,
      successfulOrders: successfulOrders.length,
      cancelledOrders: cancelledOrders.length,
      grossRevenue: totalRevenue,
      message: `🍕 Pizza Expert Daily Digest (${new Date().toLocaleDateString(
        'en-IN'
      )}): ${successfulOrders.length} delivered orders | ₹${totalRevenue.toLocaleString()} gross revenue | ${
        cancelledOrders.length
      } cancellations.`,
    }

    return NextResponse.json(digestPayload)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Digest calculation failed' }, { status: 500 })
  }
}
