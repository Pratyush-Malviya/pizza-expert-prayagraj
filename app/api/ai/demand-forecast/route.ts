import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { storeId, timeframe = 7 } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const supabase = await createAdminClient();
    
    let query = supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
      
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    
    const { data: orders } = await query;
    
    const dailySales: Record<string, number> = {};
    orders?.forEach((o: any) => {
      const date = o.created_at.split('T')[0];
      dailySales[date] = (dailySales[date] || 0) + Number(o.total || 0);
    });

    const prompt = `
You are an expert restaurant demand forecaster.
Based on the following daily sales data for the last 30 days:
${JSON.stringify(dailySales)}

Predict the demand (expected sales and order volume) for the next ${timeframe} days.
Provide your response as a valid JSON array of objects with the following schema:
{
  "date": "YYYY-MM-DD",
  "expected_revenue": number,
  "confidence": "High" | "Medium" | "Low",
  "notes": "Brief explanation"
}
Return ONLY JSON without markdown block formatting.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const forecast = JSON.parse(response.text || '[]');
    return NextResponse.json({ success: true, forecast });
  } catch (error: any) {
    console.error('Demand forecast error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
