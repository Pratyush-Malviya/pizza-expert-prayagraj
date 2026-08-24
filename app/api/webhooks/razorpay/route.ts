import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmationEmail, sendAdminNewOrderAlert } from '@/lib/utils/resend'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

    // Verify webhook HMAC signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')

      if (expectedSignature !== signature) {
        console.warn('Razorpay webhook signature mismatch')
        return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 400 })
      }
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event
    const paymentEntity = payload.payload?.payment?.entity

    if (event === 'payment.captured' || event === 'order.paid') {
      const razorpayOrderId = paymentEntity?.order_id
      const razorpayPaymentId = paymentEntity?.id
      const notesOrderId = paymentEntity?.notes?.orderId

      if (!notesOrderId && !razorpayOrderId) {
        return NextResponse.json({ success: true, message: 'Event ignored: no order ID' })
      }

      const adminClient = createAdminClient()

      // Look up order by ID or notes
      let orderQuery = adminClient.from('orders').select('*, order_items(*, products(name))')
      if (notesOrderId) {
        orderQuery = orderQuery.eq('id', notesOrderId)
      }

      const { data: order } = await orderQuery.single()

      if (order && order.status !== 'confirmed') {
        // Idempotently update order status & payment status
        await adminClient
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        // Record payment log
        try {
          await adminClient.from('payments').insert({
            order_id: order.id,
            gateway: 'razorpay',
            payment_id: razorpayPaymentId || `pay_wh_${Date.now()}`,
            amount: Number(paymentEntity?.amount || 0) / 100 || order.total,
            status: 'captured',
          })
        } catch (pe) {
          console.warn('Webhook payment log note:', pe)
        }

        // Send notifications
        const addr = order.address_json || {}
        const itemsList = (order.order_items || []).map((i: any) => ({
          name: i.products?.name || 'Wood-Fired Pizza',
          quantity: i.quantity,
          unitPrice: Number(i.unit_price) || 0,
        }))

        if (addr.email) {
          sendOrderConfirmationEmail(addr.email, {
            orderId: order.id,
            customerName: addr.name || 'Customer',
            items: itemsList,
            total: Number(order.total) || 0,
          }).catch((e) => console.warn('Webhook customer email warning:', e))
        }

        sendAdminNewOrderAlert({
          orderId: order.id,
          customerName: addr.name || 'Customer',
          phone: addr.phone || 'N/A',
          address: [addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(', '),
          items: itemsList,
          total: Number(order.total) || 0,
          paymentMethod: 'razorpay (Paid via Webhook)',
        }).catch((e) => console.warn('Webhook admin alert warning:', e))
      }
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error: any) {
    console.error('Razorpay webhook processing error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
