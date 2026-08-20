import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { storeId } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = await createAdminClient();
    
    let query = supabase.from('ingredients').select('name, current_stock, reorder_threshold, unit, cost_per_unit');
      
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    
    const { data: inventory } = await query;
    
    const prompt = `
You are a smart AI inventory assistant for a pizzeria.
Here is the current inventory data:
${JSON.stringify(inventory)}

Analyze the inventory levels and provide recommendations.
Provide your response as a valid JSON object with the following schema:
{
  "alerts": [
    { "item": "string", "issue": "string", "recommendation": "string", "urgency": "High" | "Medium" | "Low" }
  ],
  "purchasing_suggestions": [
    { "item": "string", "suggested_quantity": 0, "reason": "string" }
  ]
}
Return ONLY JSON without markdown block formatting.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const insights = JSON.parse(response.text || '{}');
    return NextResponse.json({ success: true, insights });
  } catch (error: any) {
    console.error('Smart inventory error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
