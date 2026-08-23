import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name')
      .eq('active', true)

    if (!error && stores && Array.isArray(stores) && stores.length > 0) {
      return NextResponse.json({ stores })
    }
  } catch {
    // Database table may not be initialized yet; return default single store
  }

  return NextResponse.json({
    stores: [
      { id: 'main-prayagraj', name: 'Prayagraj (Main Outlet)' },
    ],
  })
}
