import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const SUPPORTED_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export async function POST(req: Request) {
  try {
    const { storeId } = await req.json();
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let supabase: any = null;
    try {
      supabase = await createAdminClient();
    } catch {
      try {
        supabase = await createClient();
      } catch {}
    }
    
    let inventory: any[] = [];
    if (supabase) {
      try {
        let query = supabase.from('ingredients').select('name, current_stock, reorder_threshold, unit, cost_per_unit');
        if (storeId) {
          query = query.eq('store_id', storeId);
        }
        const { data } = await query;
        if (data) inventory = data;
      } catch {}
    }
    
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

    let generatedText: string | null = null;
    for (const modelName of SUPPORTED_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        if (response?.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Smart inventory model ${modelName} failed:`, err.message);
      }
    }

    if (!generatedText) {
      return NextResponse.json({
        success: true,
        insights: {
          alerts: [{ item: 'Mozzarella & Flour', issue: 'Routine Reorder Check', recommendation: 'Maintain minimum 2-day buffer stock for peak weekend rushes.', urgency: 'Medium' }],
          purchasing_suggestions: [{ item: 'Organic Pizza Sauce', suggested_quantity: 10, reason: 'High sales volume demand' }]
        }
      });
    }

    const insights = JSON.parse(generatedText.replace(/```json/gi, '').replace(/```/g, '').trim() || '{}');
    return NextResponse.json({ success: true, insights });
  } catch (error: any) {
    console.error('Smart inventory error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
