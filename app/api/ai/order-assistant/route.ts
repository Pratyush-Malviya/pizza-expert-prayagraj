import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { history, storeId } = await req.json()
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const supabase = await createAdminClient()
    
    // Fetch categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // Fetch products
    let qProducts = supabase
      .from('products')
      .select('id, name, slug, price, description, is_veg, is_spicy, category_id')
      .eq('is_available', true)

    if (storeId) qProducts = qProducts.eq('store_id', storeId)
    const { data: products } = await qProducts

    const prompt = `
You are the AI Order Assistant for "Pizza Expert Prayagraj" (located in Allapur, Prayagraj).
You help customers browse our menu, get recommendations, customize orders, and navigate the store.

AVAILABLE CATEGORIES:
${JSON.stringify(categories || [])}

AVAILABLE PRODUCTS (summary):
${JSON.stringify(
  (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    category_id: p.category_id,
    price: p.price,
    is_veg: p.is_veg,
    is_spicy: p.is_spicy,
  }))
)}

CRITICAL FORMATTING RULES:
1. NEVER output a raw text list of menu items, bulleted menu items, or prices in your reply text (e.g. Do NOT write "1. Margherita ₹199, 2. Farmhouse ₹299").
2. The UI renders interactive visual cards with photos, tags, and "+ Add to Cart" buttons.
3. Keep your reply text very short, friendly, and natural (1 to 2 sentences max).
4. You MUST return your response as a valid JSON object with the following schema:
{
  "reply": "Short 1-2 sentence friendly response",
  "showCategories": boolean, // true if customer wants to see menu categories or browse generally
  "categorySlug": "slug of category if customer is asking for a specific category like pizzas, burgers, beverages, sides, desserts, combos",
  "productIds": ["array of matching product IDs if customer is looking for specific items or recommendations"]
}

Conversation History:
${JSON.stringify(
  (history || [])
    .filter((h: any) => h.kind === 'text')
    .map((h: any) => ({ role: h.role, text: h.text }))
)}

Respond ONLY with the valid JSON object. Do not include markdown code block backticks.
`

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    })

    const rawText = response.text || '{}'
    let parsed: {
      reply?: string
      showCategories?: boolean
      categorySlug?: string
      productIds?: string[]
    } = {}

    try {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleanJson)
    } catch {
      parsed = {
        reply: rawText.replace(/```json/gi, '').replace(/```/g, '').trim(),
      }
    }

    return NextResponse.json({
      success: true,
      reply: parsed.reply || 'Here is what we have on our menu! 🍕',
      showCategories: Boolean(parsed.showCategories),
      categorySlug: parsed.categorySlug || null,
      productIds: Array.isArray(parsed.productIds) ? parsed.productIds : [],
    })
  } catch (error: any) {
    console.error('Order assistant error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
