import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { orderId, amount, reason } = await request.json()

    if (!orderId || !amount) {
      return NextResponse.json({ success: false, error: 'Missing orderId or amount' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Generate gateway refund reference
    const refundRef = `RFND-RZP-${Date.now()}`

    // 2. Insert into refund_requests table
    const { data: refundReq, error } = await supabase
      .from('refund_requests')
      .insert({
        order_id: orderId,
        payment_gateway: 'razorpay',
        gateway_refund_id: refundRef,
        amount: Number(amount),
        status: 'processed',
        reason: reason || 'Order cancelled by store',
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 3. Update payment status to refunded
    await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('order_id', orderId)

    // 4. Update order status to refunded
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      refundId: refundReq.id,
      refundReference: refundRef,
      status: 'processed',
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Refund processing failed' }, { status: 500 })
  }
}
