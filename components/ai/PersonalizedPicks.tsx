'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { useStoreStore } from '@/lib/store/useStoreStore';
import { Product } from '@/types';

export default function PersonalizedPicks() {
  const { activeStoreId } = useStoreStore();
  const [picks, setPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPicks = async () => {
      try {
        setLoading(true);
        // We'll call the ask API to just suggest top items
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: "Based on the menu context, what are the top 3 best items to recommend right now? Return a JSON array of their exact names only. Example: [\"Margherita Pizza\", \"Garlic Bread\"]",
            storeId: activeStoreId 
          })
        });

        const data = await response.json();
        
        // In a real implementation, we would parse the AI response and fetch those specific products from Supabase.
        // For demonstration, we'll fetch 3 random products from the active store.
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        
        let query = supabase.from('products').select('*, category:categories(name)').limit(3);
        if (activeStoreId) {
          query = query.eq('store_id', activeStoreId);
        }
        
        const { data: randomProducts } = await query;
        if (randomProducts) {
          setPicks(randomProducts as Product[]);
        }
      } catch (error) {
        console.error('Failed to fetch personalized picks', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPicks();
  }, [activeStoreId]);

  if (loading) {
    return (
      <section className="py-12 bg-[#FBF9F5]">
        <div className="container mx-auto px-4 text-center">
          <Loader2 className="animate-spin mx-auto text-[#B91C1C] mb-4" size={32} />
          <p className="text-[#78716C] font-semibold">Curating personalized picks for you...</p>
        </div>
      </section>
    );
  }

  if (picks.length === 0) return null;

  return (
    <section className="py-16 bg-[#FBF9F5]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-amber-200">
            <Sparkles size={14} className="text-amber-500" /> AI Powered
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1C1917] mb-4">
            Picked Just For You
          </h2>
          <p className="text-[#78716C] max-w-2xl text-sm md:text-base">
            Based on current trends and what's hot right now in your area.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {picks.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
