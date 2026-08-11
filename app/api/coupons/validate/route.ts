import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json()
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Query coupon by code
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 404 })
    }

    // Check minimum order
    if (subtotal < (coupon.min_order || 0)) {
      return NextResponse.json({ error: `Minimum order value of ₹${coupon.min_order} required for this coupon` }, { status: 400 })
    }

    // Check targeted user restriction
    if (coupon.target_user_id) {
      if (!user || user.id !== coupon.target_user_id) {
        return NextResponse.json({ error: 'This coupon is exclusively reserved for a specific account' }, { status: 403 })
      }
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.type === 'percentage') {
      discountAmount = Math.round((subtotal * coupon.value) / 100)
    } else {
      discountAmount = coupon.value
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 500 })
  }
}
