import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { items, sessionId } = await request.json()
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid items payload' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (sessionId) {
      // Update existing session
      await supabase
        .from('cart_sessions')
        .update({
          items,
          last_updated: new Date().toISOString(),
          user_id: user?.id || null,
        })
        .eq('id', sessionId)

      return NextResponse.json({ success: true, sessionId })
    } else {
      // Create new cart session
      const { data, error } = await supabase
        .from('cart_sessions')
        .insert({
          user_id: user?.id || null,
          items,
          last_updated: new Date().toISOString(),
          recovered: false,
        })
        .select('id')
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, sessionId: data.id })
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Cart sync failed' }, { status: 500 })
  }
}
