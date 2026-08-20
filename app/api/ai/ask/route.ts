import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { question, storeId } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = await createAdminClient();
    
    let qOrders = supabase.from('orders').select('id, total, status, created_at').order('created_at', { ascending: false }).limit(50);
    if (storeId) qOrders = qOrders.eq('store_id', storeId);
    const { data: recentOrders } = await qOrders;
    
    let qProducts = supabase.from('products').select('name, price');
    if (storeId) qProducts = qProducts.eq('store_id', storeId);
    const { data: products } = await qProducts;

    const prompt = `
You are an AI assistant for a restaurant manager.
Answer the following question based on the provided restaurant data.

Question: ${question}

Recent Orders Context (up to 50):
${JSON.stringify(recentOrders)}

Menu Context:
${JSON.stringify(products)}

Provide a concise, helpful, and professional answer. Do not use markdown block formatting if unnecessary.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ success: true, answer: response.text });
  } catch (error: any) {
    console.error('Ask data error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
