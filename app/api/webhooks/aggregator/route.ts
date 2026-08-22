import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/webhooks/aggregator
 * Ingests orders from Zomato/Swiggy partner webhook.
 * Enforces secret validation and external_order_id idempotency.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify Webhook Secret / Signature Header
    const webhookSecret = process.env.AGGREGATOR_WEBHOOK_SECRET
    if (webhookSecret) {
      const incomingSecret =
        request.headers.get('x-aggregator-secret') ||
        request.headers.get('x-webhook-secret') ||
        request.headers.get('authorization')?.replace('Bearer ', '')

      if (incomingSecret !== webhookSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid or missing aggregator webhook secret' },
          { status: 401 }
        )
      }
    }

    const payload = await request.json()
    const { source, externalOrderId, customerName, customerPhone, items, subtotal, tax, total } = payload

    if (!source || !['zomato', 'swiggy'].includes(source.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Invalid aggregator source' }, { status: 400 })
    }

    if (!externalOrderId) {
      return NextResponse.json({ success: false, error: 'externalOrderId is required for idempotency' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 2. Idempotency check: reject duplicate external order IDs
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('external_order_id', externalOrderId)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        message: `Order ${externalOrderId} already ingested (idempotent)`,
        orderId: existingOrder.id,
        duplicate: true,
      })
    }

    // 3. Normalize and insert order into Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        source: source.toLowerCase(),
        external_order_id: externalOrderId,
        status: 'confirmed',
        subtotal: subtotal || total,
        tax: tax || 0,
        delivery_fee: 0,
        discount: 0,
        total: total || 499,
        address_json: {
          name: customerName || `${source.toUpperCase()} Order`,
          phone: customerPhone || 'N/A',
          line1: `${source.toUpperCase()} Delivery`,
        },
        notes: `Aggregator Order Ingested from ${source.toUpperCase()}`,
      })
      .select()
      .single()

    if (orderErr) {
      return NextResponse.json({ success: false, error: orderErr.message }, { status: 500 })
    }

    // 4. Record status history
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
