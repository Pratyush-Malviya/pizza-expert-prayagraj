import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/refunds/process
 *
 * Initiates a refund via Razorpay API.
 * Requires: super_admin role (enforced via Supabase admin client + RLS check)
 * Body: { orderId: string, amount: number, reason?: string }
 */
export async function POST(request: Request) {
  try {
    const { orderId, amount, reason } = await request.json()

    if (!orderId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing orderId or amount' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ─── 1. Auth guard: only super_admin can initiate refunds ──────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only super admins can process refunds' },
        { status: 403 }
      )
    }

    // ─── 2. Idempotency: Check for existing refund on this order ───────
    const { data: existingRefund } = await supabase
      .from('refund_requests')
      .select('id, status, gateway_refund_id')
      .eq('order_id', orderId)
      .in('status', ['pending', 'processing', 'processed'])
      .maybeSingle()

    if (existingRefund) {
      return NextResponse.json({
        success: false,
        error: `Refund already ${existingRefund.status} for this order (ref: ${existingRefund.gateway_refund_id || existingRefund.id})`,
      }, { status: 409 })
    }

    // ─── 3. Fetch the original payment to get gateway_payment_id ───────
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .select('gateway_payment_id, gateway_order_id, status, amount')
      .eq('order_id', orderId)
      .eq('status', 'paid')
      .maybeSingle()

    if (paymentErr || !payment) {
      return NextResponse.json(
        { success: false, error: 'No confirmed payment found for this order' },
        { status: 404 }
      )
    }

    // ─── 4. Create refund_request record as 'processing' ───────────────
    const { data: refundRecord, error: refundErr } = await supabase
      .from('refund_requests')
      .insert({
        order_id: orderId,
        payment_gateway: 'razorpay',
        gateway_payment_id: payment.gateway_payment_id,
        amount: Number(amount),
        status: 'processing',
        reason: reason || 'Order cancelled by store',
        initiated_by: user.id,
      })
      .select()
      .single()

    if (refundErr) {
      return NextResponse.json({ success: false, error: refundErr.message }, { status: 500 })
    }

    // ─── 5. Call Razorpay Refund API ────────────────────────────────────
    let gatewayRefundId: string | null = null
    let gatewayStatus: 'processed' | 'failed' = 'processed'

    const rzpKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET

    if (rzpKeyId && rzpKeySecret && payment.gateway_payment_id) {
      try {
        const basicAuth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64')
        const rzpResponse = await fetch(
          `https://api.razorpay.com/v1/payments/${payment.gateway_payment_id}/refund`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Math.round(Number(amount) * 100), // Razorpay uses paise
              notes: { reason: reason || 'Order cancelled', orderId },
            }),
          }
        )

        if (rzpResponse.ok) {
          const rzpData = await rzpResponse.json()
          gatewayRefundId = rzpData.id
          gatewayStatus = 'processed'
        } else {
          const errBody = await rzpResponse.json().catch(() => ({}))
          console.error('Razorpay refund error:', errBody)
          gatewayStatus = 'failed'
        }
      } catch (rzpErr) {
        console.error('Razorpay API call failed:', rzpErr)
        gatewayStatus = 'failed'
      }
    } else {
      // Test mode / no keys: simulate successful refund
      gatewayRefundId = `rfnd_test_${Date.now()}`
      gatewayStatus = 'processed'
    }

    // ─── 6. Update refund_request with result ──────────────────────────
    await supabase
      .from('refund_requests')
      .update({
        gateway_refund_id: gatewayRefundId,
        status: gatewayStatus,
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundRecord.id)

    if (gatewayStatus === 'failed') {
      return NextResponse.json(
        { success: false, error: 'Razorpay refund failed. Please process manually from the Razorpay dashboard.' },
        { status: 502 }
      )
    }

    // ─── 7. Update payment and order statuses ──────────────────────────
    await supabase.from('payments').update({ status: 'refunded' }).eq('order_id', orderId)
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId)

    // ─── 8. Audit log ──────────────────────────────────────────────────
    try {
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'REFUND_INITIATED',
        target_table: 'orders',
        target_id: orderId,
        after: { refund_id: refundRecord.id, amount, gateway_refund_id: gatewayRefundId, reason },
      })
    } catch {} // audit log failure should not block refund

    return NextResponse.json({
      success: true,
      refundId: refundRecord.id,
      gatewayRefundId,
      status: 'processed',
      message: `Refund of ₹${amount} initiated successfully.`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Refund processing failed' },
      { status: 500 }
    )
  }
}
