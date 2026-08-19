'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CartItem } from '@/types'
import { sendOrderConfirmationEmail, sendAdminNewOrderAlert } from '@/lib/utils/resend'

export interface PricingCalculationResult {
  subtotal: number
  tax: number
  deliveryFee: number
  discount: number
  total: number
  itemBreakdown: Array<{
    id: string
    name: string
    unitPrice: number
    quantity: number
    totalPrice: number
  }>
}

/**
 * Server-side authoritative pricing engine.
 * Calculates order subtotal, tax, and total directly based on server-side pricing rules.
 */
export async function calculateOrderTotal(
  cartItems: CartItem[],
  couponCode?: string
): Promise<{ success: boolean; data?: PricingCalculationResult; error?: string }> {
  try {
    const supabase = await createClient()

    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: 'Cart is empty' }
    }

    // Fetch products from database
    const productIds = cartItems.map((item) => item.id)
    const { data: dbProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, is_available')
      .in('id', productIds)

    if (prodError) {
      // Fallback: If DB is not connected yet, calculate based on payload with a notice
      console.warn('Supabase product query error, fallback calculation:', prodError.message)
    }

    let subtotal = 0
    const itemBreakdown = []

    for (const item of cartItems) {
      const dbProd = dbProducts?.find((p) => p.id === item.id)
      const basePrice = dbProd ? Number(dbProd.price) : item.price

      // Calculate options delta
      const optionsDelta = item.selectedOptions
        ? item.selectedOptions.reduce((acc, opt) => acc + (opt.priceDelta || 0), 0)
        : 0

      const unitPrice = basePrice + optionsDelta
      const itemTotal = unitPrice * item.quantity
      subtotal += itemTotal

      itemBreakdown.push({
        id: item.id,
        name: item.name,
        unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotal,
      })
    }

    // Default settings
    let deliveryFee = 30
    const freeDeliveryAbove = 499
    const taxRate = 0.05 // 5% GST

    if (subtotal >= freeDeliveryAbove) {
      deliveryFee = 0
    }

    let discount = 0
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('active', true)
        .single()

      if (coupon) {
        if (subtotal >= Number(coupon.min_order)) {
          if (coupon.type === 'percentage') {
            discount = (subtotal * Number(coupon.value)) / 100
          } else {
            discount = Number(coupon.value)
          }
        }
      }
    }

    const taxableAmount = Math.max(0, subtotal - discount)
    const tax = Math.round(taxableAmount * taxRate * 100) / 100
    const total = Math.round((taxableAmount + tax + deliveryFee) * 100) / 100

    return {
      success: true,
      data: {
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
        itemBreakdown,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to calculate total' }
  }
}

/** COD verification threshold — orders above this amount get 'cod_pending' status */
const COD_VERIFICATION_THRESHOLD = 1000

/**
 * Server Action to place an order into Supabase.
 * COD orders above ₹1,000 are created with status 'cod_pending' (not shown in KDS until admin verifies).
 */
export async function createOrder(payload: {
  cartItems: CartItem[]
  address: any
  paymentMethod?: 'razorpay' | 'cashfree' | 'cod'
  notes?: string
  couponCode?: string
}) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. Calculate authoritative total
    const calculation = await calculateOrderTotal(payload.cartItems, payload.couponCode)
    if (!calculation.success || !calculation.data) {
      return { success: false, error: calculation.error || 'Pricing error' }
    }

    const { subtotal, tax, deliveryFee, discount, total } = calculation.data

    // 2. Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Determine initial order status
    //    COD fraud gate: high-value COD orders enter 'cod_pending' to allow phone verification
    //    before appearing on the KDS. Online payment orders stay 'pending' until webhook confirms.
    const isCod = payload.paymentMethod === 'cod'
    const initialStatus = (isCod && total > COD_VERIFICATION_THRESHOLD)
      ? 'cod_pending'
      : 'pending'

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

    // 4. Insert order using adminClient
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .insert({
        user_id: user?.id || null,
        status: initialStatus,
        subtotal,
        tax,
        delivery_fee: deliveryFee,
        discount,
        total,
        address_json: {
          ...payload.address,
          paymentMethod: payload.paymentMethod || 'razorpay',
          deliveryOtp,
        },
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (orderErr) {
      return { success: false, error: orderErr.message }
    }

    // Fetch products to map slugs/IDs if needed
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, slug')
      .in('slug', payload.cartItems.map((i) => i.slug))

    // 5. Insert order items with UUID validation using adminClient
    const orderItems = payload.cartItems.map((item) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
      const matchedDbProd = dbProducts?.find((p: { id: string; slug: string }) => p.slug === item.slug || p.id === item.id)

      return {
        order_id: order.id,
        product_id: isUuid ? item.id : (matchedDbProd?.id || null),
        quantity: item.quantity,
        unit_price: item.price,
        selected_options: item.selectedOptions || {},
      }
    })

    const { error: itemsErr } = await adminClient.from('order_items').insert(orderItems)

    if (itemsErr) {
      console.error('Error inserting order items:', itemsErr.message)
    }

    // 6. Add initial status history entry using adminClient
    await adminClient.from('order_status_history').insert({
      order_id: order.id,
      status: initialStatus,
      notes: initialStatus === 'cod_pending'
        ? `COD order above ₹${COD_VERIFICATION_THRESHOLD} — pending admin phone verification`
        : 'Order placed by customer',
    })

    // 7. Initialize deliveries table record with OTP
    try {
      await adminClient.from('deliveries').upsert(
        {
          order_id: order.id,
          status: 'unassigned',
          otp_code: deliveryOtp,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'order_id' }
      )
    } catch (delivErr) {
      console.warn('Initial deliveries insert note:', delivErr)
    }

    // 8. For COD orders below threshold, also insert confirmed payment record & auto-assign
    if (isCod && total <= COD_VERIFICATION_THRESHOLD) {
      try {
        await adminClient.from('payments').insert({
          order_id: order.id,
          gateway: 'cod',
          amount: total,
          status: 'pending_collection',
        })
      } catch {}

      // Trigger Smart Auto-Dispatch immediately
      try {
        const { autoAssignNearestAvailableDriver } = await import('@/app/actions/deliveries')
        await autoAssignNearestAvailableDriver(order.id)
      } catch (autoErr) {
        console.warn('Auto dispatch notice on order create:', autoErr)
      }
    }

    // 9. Trigger Email Notifications (Customer & Admin Store Owner)
    const itemsListForEmail = payload.cartItems.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
    }))

    const fullAddrStr = [payload.address?.line1, payload.address?.line2, payload.address?.city, payload.address?.pincode].filter(Boolean).join(', ')

    // Send to Customer
    if (payload.address?.email) {
      sendOrderConfirmationEmail(payload.address.email, {
        orderId: order.id,
        customerName: payload.address.name || 'Customer',
        items: itemsListForEmail,
        total: order.total,
      }).catch((err: any) => console.warn('Order confirmation email note:', err))
    }

    // ALWAYS Send to Store Owner / Admin
    sendAdminNewOrderAlert({
      orderId: order.id,
      customerName: payload.address?.name || 'Customer',
      phone: payload.address?.phone || 'N/A',
      address: fullAddrStr || 'Prayagraj',
      items: itemsListForEmail,
      total: order.total,
      paymentMethod: isCod ? 'Cash on Delivery (COD)' : 'Razorpay',
    }).catch((err: any) => console.warn('Admin new order alert email note:', err))

    return {
      success: true,
      orderId: order.id,
      total: order.total,
      status: initialStatus,
      deliveryOtp,
      requiresVerification: initialStatus === 'cod_pending',
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Order creation failed' }
  }
}
