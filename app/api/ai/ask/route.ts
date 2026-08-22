import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & verify RBAC permissions
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    const cookieStore = await cookies()
    const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

    if (!user && !isSimpleAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required to access store intelligence.' },
        { status: 401 }
      )
    }

    if (
      user &&
      user.email !== 'malviya.pratyush26@gmail.com' &&
      user.user_metadata?.role !== 'super_admin' &&
      !isSimpleAdmin
    ) {
      const adminClient = await createAdminClient()
      const { data: profile } = await adminClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      const allowedRoles = ['super_admin', 'manager', 'accountant', 'admin']
      if (!profile || !profile.is_active || !allowedRoles.includes(profile.role)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden. Manager or admin privileges required.' },
          { status: 403 }
        )
      }
    }

    const { question, storeId } = await req.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ success: false, error: 'Question is required.' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured in server environment.' },
        { status: 500 }
      )
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const supabase = await createAdminClient()

    let qOrders = supabase
      .from('orders')
      .select('id, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (storeId) qOrders = qOrders.eq('store_id', storeId)
    const { data: recentOrders } = await qOrders

    let qProducts = supabase.from('products').select('name, price')
    if (storeId) qProducts = qProducts.eq('store_id', storeId)
    const { data: products } = await qProducts

    const prompt = `
You are an AI assistant for a restaurant manager at Pizza Expert Prayagraj.
Answer the following question based on the provided restaurant operational data.

Question: ${question.slice(0, 500)}

Recent Orders Context (up to 50):
${JSON.stringify(recentOrders || [])}

Menu Context:
${JSON.stringify(products || [])}

Provide a concise, helpful, and professional business answer. Do not expose individual customer PII or raw internal database schemas.
`

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    })

    return NextResponse.json({ success: true, answer: response.text })
  } catch (error: any) {
    console.error('Ask data error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
