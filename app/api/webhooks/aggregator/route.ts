import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { source, externalOrderId, customerName, customerPhone, items, subtotal, tax, total } = payload

    if (!source || !['zomato', 'swiggy'].includes(source.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Invalid aggregator source' }, { status: 400 })
    }

    const supabase = await createClient()

    // Normalize and insert order into Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        source: source.toLowerCase(),
        external_order_id: externalOrderId || `EXT-${Date.now()}`,
        status: 'confirmed',
        subtotal: subtotal || total,
        tax: tax || 0,
        delivery_fee: 0,
        discount: 0,
        total: total || 499,
        address_json: { name: customerName || `${source.toUpperCase()} Order`, phone: customerPhone || 'N/A', line1: `${source.toUpperCase()} Delivery` },
        notes: `Aggregator Order Ingested from ${source.toUpperCase()}`,
      })
      .select()
      .single()

    if (orderErr) {
      return NextResponse.json({ success: false, error: orderErr.message }, { status: 500 })
    }

    // Record status history
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'confirmed',
      notes: `Order ingested automatically from ${source.toUpperCase()} Partner Webhook`,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${source.toUpperCase()} order #${order.id}`,
      orderId: order.id,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Webhook ingestion failed' }, { status: 500 })
  }
}
