import { NextRequest, NextResponse } from 'next/server'
import { calculateOrderTotal } from '@/app/actions/orders'

export async function POST(req: NextRequest) {
  try {
    const { code, cartItems } = await req.json()
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const calcResult = await calculateOrderTotal(cartItems, code)
    
    if (!calcResult.success || !calcResult.data) {
      return NextResponse.json({ error: calcResult.error || 'Failed to validate coupon' }, { status: 400 })
    }

    if (calcResult.data.discount === 0) {
      return NextResponse.json({ error: 'Coupon is invalid, expired, or minimum order value not met.' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      code: code.toUpperCase(),
      discountAmount: calcResult.data.discount,
      subtotal: calcResult.data.subtotal,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Validation error' }, { status: 500 })
  }
}
