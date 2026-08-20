import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { history, storeId } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = await createAdminClient();
    
    let qProducts = supabase.from('products').select('id, name, price, description, category_id');
    if (storeId) qProducts = qProducts.eq('store_id', storeId);
    const { data: products } = await qProducts;

    const prompt = `
You are a helpful customer service assistant for our pizza restaurant.
Here is the current menu and pricing:
${JSON.stringify(products)}

Help the customer with their order, answer questions about the menu, and provide recommendations.
Always be polite and concise.

Conversation History:
${JSON.stringify(history)}

Provide the next response from the assistant. Do NOT include any prefixes like "Assistant:".
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ success: true, reply: response.text });
  } catch (error: any) {
    console.error('Order assistant error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
