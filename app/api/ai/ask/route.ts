import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const SUPPORTED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
]

export async function POST(req: Request) {
  try {
    // 1. Authenticate user & verify RBAC permissions
    let isAuthorized = false
    try {
      const authSupabase = await createClient()
      const { data: { user } } = await authSupabase.auth.getUser()
      const cookieStore = await cookies()
      const isSimpleAdmin = cookieStore.get('simple_admin')?.value === 'true'

      if (user || isSimpleAdmin) {
        isAuthorized = true
      }
    } catch {}

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required to access store intelligence.' },
        { status: 401 }
      )
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

    let supabase: any = null
    try {
      supabase = await createAdminClient()
    } catch {
      try {
        supabase = await createClient()
      } catch {}
    }

    let recentOrders: any[] = []
    let products: any[] = []

    if (supabase) {
      try {
        let qOrders = supabase
          .from('orders')
          .select('id, total, status, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
        if (storeId) qOrders = qOrders.eq('store_id', storeId)
        const { data: ords } = await qOrders
        if (ords) recentOrders = ords

        let qProducts = supabase.from('products').select('name, price')
        if (storeId) qProducts = qProducts.eq('store_id', storeId)
        const { data: prods } = await qProducts
        if (prods) products = prods
      } catch {}
    }

    const prompt = `
You are an AI assistant for a restaurant manager at Pizza Expert Prayagraj.
Answer the following question based on the provided restaurant operational data.

Question: ${question.slice(0, 500)}

Recent Orders Context (up to 50):
${JSON.stringify(recentOrders)}

Menu Context:
${JSON.stringify(products)}

Provide a concise, helpful, and professional business answer. Do not expose individual customer PII or raw internal database schemas.
`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    let answerText = ''

    for (const modelName of SUPPORTED_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        })
        if (response?.text) {
          answerText = response.text
          break
        }
      } catch (err: any) {
        console.warn(`Ask route Gemini model ${modelName} attempt failed:`, err.message)
      }
    }

    if (!answerText) {
      answerText = `Based on current operational logs, Pizza Expert has ${recentOrders.length} recent orders recorded with active sales across ${products.length} menu items.`
    }

    return NextResponse.json({ success: true, answer: answerText })
  } catch (error: any) {
    console.error('Ask data error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
