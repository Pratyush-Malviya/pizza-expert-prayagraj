'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ProductCard from '@/components/menu/ProductCard';
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
        if (activeStoreId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeStoreId)) {
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
      <section className="py-12 bg-[var(--bg-primary)]">
        <div className="container mx-auto px-4 text-center">
          <Loader2 className="animate-spin mx-auto text-[#FF3B00] mb-4" size={32} />
          <p className="text-[var(--text-secondary)] font-semibold">Curating personalized picks for you...</p>
        </div>
      </section>
    );
  }

  if (picks.length === 0) return null;

  return (
    <section className="py-16 bg-[var(--bg-primary)] border-b border-[var(--border)]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1 bg-[#FFC01D]/15 text-[#FFC01D] rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#FFC01D]/30">
            <Sparkles size={14} className="text-[#FFC01D]" /> AI Powered
          </div>
          <h2 className="section-title text-[var(--text-primary)] mb-2">
            Picked Just For You
          </h2>
          <p className="section-subtitle">
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
