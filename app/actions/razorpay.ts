'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmationEmail, sendAdminNewOrderAlert } from '@/lib/utils/resend'

/**
 * Server Action to initialize a Razorpay order.
 */
export async function createRazorpayOrder(payload: {
  amount: number
  orderId: string
}): Promise<{
  success: boolean
  razorpayOrderId?: string
  keyId?: string
  amount?: number
  currency?: string
  isTestMode?: boolean
  error?: string
}> {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''
    const keySecret = process.env.RAZORPAY_KEY_SECRET || ''

    const isPlaceholder = !keyId || keyId.includes('xxxx') || !keySecret || keySecret.includes('your-')

    // If Razorpay keys are not configured or are placeholder keys
    if (isPlaceholder) {
      return {
        success: false,
        error: 'Razorpay keys are not configured. Please configure valid NEXT_PUBLIC_RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in Admin Settings or environment variables.',
      }
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const options = {
      amount: Math.round(payload.amount * 100), // amount in paise
      currency: 'INR',
      receipt: payload.orderId,
      notes: {
        orderId: payload.orderId,
      },
    }

    const order = await razorpay.orders.create(options)

    return {
      success: true,
      razorpayOrderId: order.id,
      keyId,
      amount: options.amount,
      currency: 'INR',
      isTestMode: false,
    }
  } catch (err: any) {
    console.error('Razorpay order creation error:', err)
    return {
      success: false,
      error: err.message || 'Could not initialize Razorpay payment gateway',
    }
  }
}

/**
 * Server Action to verify Razorpay signature and update order status.
 */
export async function verifyRazorpayPayment(payload: {
  orderId: string
  razorpayPaymentId: string
  razorpayOrderId: string
  razorpaySignature: string
  isTestMode?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()
    const keySecret = process.env.RAZORPAY_KEY_SECRET || ''

    if (!payload.isTestMode && keySecret && !keySecret.includes('your-')) {
      const body = payload.razorpayOrderId + '|' + payload.razorpayPaymentId
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex')

      if (expectedSignature !== payload.razorpaySignature) {
        return { success: false, error: 'Payment signature verification failed' }
      }
    }

    // 1. Update order status in Supabase to 'confirmed'
    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update({
        status: 'confirmed',
      })
      .eq('id', payload.orderId)
      .select()
      .single()

    if (updateErr) {
      console.warn('Order status update error:', updateErr.message)
    }

    // 2. Insert Payment record into Supabase
    try {
      await adminClient.from('payments').insert({
        order_id: payload.orderId,
        gateway: 'razorpay',
        payment_id: payload.razorpayPaymentId || `pay_test_${Date.now()}`,
        amount: updatedOrder?.total || 0,
        status: 'captured',
      })
    } catch (e) {
      console.warn('Payment record insert note:', e)
    }

    // 3. Add to status history
    try {
      await adminClient.from('order_status_history').insert({
        order_id: payload.orderId,
        status: 'confirmed',
        notes: `Payment verified via Razorpay (${payload.razorpayPaymentId || 'Test Pay'})`,
      })
    } catch (e) {
      console.warn('Status history insert note:', e)
    }

    // 4. Fetch full order & customer details to dispatch email notifications
    const { data: fullOrder } = await adminClient
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('id', payload.orderId)
      .single()

    if (fullOrder) {
      const addr = fullOrder.address_json || {}
      const itemsList = (fullOrder.order_items || []).map((i: any) => ({
        name: i.products?.name || 'Wood-Fired Pizza',
        quantity: i.quantity,
        unitPrice: Number(i.unit_price) || 0,
      }))

      // Send to Customer
      if (addr.email) {
        sendOrderConfirmationEmail(addr.email, {
          orderId: fullOrder.id,
          customerName: addr.name || 'Customer',
          items: itemsList,
          total: Number(fullOrder.total) || 0,
        }).catch(err => console.warn('Customer email dispatch:', err))
      }

      // ALWAYS Send to Store Owner / Admin
      sendAdminNewOrderAlert({
        orderId: fullOrder.id,
        customerName: addr.name || 'Customer',
        phone: addr.phone || 'N/A',
        address: [addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(', '),
        items: itemsList,
        total: Number(fullOrder.total) || 0,
        paymentMethod: 'razorpay (Paid)',
      }).catch(err => console.warn('Admin email alert dispatch:', err))
    }

    return { success: true }
  } catch (err: any) {
    console.error('Razorpay verification error:', err)
    return { success: false, error: err.message || 'Payment verification failed' }
  }
}
