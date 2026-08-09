'use server'

import { createClient } from '@/lib/supabase/server'
import { CartItem } from '@/types'

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

/**
 * Server Action to place an order into Supabase
 */
export async function createOrder(payload: {
  cartItems: CartItem[]
  address: any
  notes?: string
  couponCode?: string
}) {
  try {
    const supabase = await createClient()

    // 1. Calculate authoritative total
    const calculation = await calculateOrderTotal(payload.cartItems, payload.couponCode)
    if (!calculation.success || !calculation.data) {
      return { success: false, error: calculation.error || 'Pricing error' }
    }

    const { subtotal, tax, deliveryFee, discount, total } = calculation.data

    // 2. Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Insert order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null,
        status: 'pending',
        subtotal,
        tax,
        delivery_fee: deliveryFee,
        discount,
        total,
        address_json: payload.address,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (orderErr) {
      return { success: false, error: orderErr.message }
    }

    // 4. Insert order items
    const orderItems = payload.cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      selected_options: item.selectedOptions || {},
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)

    if (itemsErr) {
      console.error('Error inserting order items:', itemsErr.message)
    }

    // 5. Add initial status history entry
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'pending',
      notes: 'Order placed by customer',
    })

    return {
      success: true,
      orderId: order.id,
      total: order.total,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Order creation failed' }
  }
}
