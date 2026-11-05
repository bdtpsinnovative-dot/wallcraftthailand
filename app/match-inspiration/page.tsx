'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

interface Item {
  id: number | string;
  name: string;
  collection: string;
  seriesTitle: string;
  image_url: string;
}

export default function MatchInspirationPage() {
  const [items, setItems] = useState<Item[]>([
    {
      id: 7931,
      name: 'Travertine',
      collection: 'Tarra Stone',
      seriesTitle: 'Craft Stone',
      image_url: 'https://exspotdensjbmwzvifpk.supabase.co/storage/v1/object/public/product-gallery/1770714134470-869.webp'
    },
    {
      id: 6428,
      name: 'L.Meadow',
      collection: 'Fabric',
      seriesTitle: 'Luxe Series',
      image_url: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/master_assets/1773376443057-602.webp?v=1773376443768'
    },
    {
      id: 6368,
      name: 'Solid Panorama',
      collection: 'Solid Panel',
      seriesTitle: 'Essential Series',
      image_url: 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/master_assets/1773311878262-392.webp?v=1773311879901'
    }
  ]);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, collection, image_url')
          .not('image_url', 'is', null);

        if (!data || data.length === 0) return;
        const valid = data.filter((p: any) => p.image_url && p.image_url.startsWith('http'));

        const craftList: Item[] = [];
        const luxeList: Item[] = [];
        const essentialList: Item[] = [];

        for (const p of valid) {
          const col = (p.collection || '').toLowerCase();
          if (
            col.includes('stone') || col.includes('tarra') || col.includes('terra') ||
            col.includes('panorama') || col.includes('rock') || col.includes('geo') ||
            col.includes('urban') || col.includes('nature') || col.includes('rust') || col.includes('finesse')
          ) {
            craftList.push({ ...p, seriesTitle: 'Craft Stone' });
          } else if (
            col.includes('fabric') || col.includes('leather') || col.includes('metal') ||
            col.includes('velvet') || col.includes('wood') || col.includes('signature') || col.includes('outdoor')
          ) {
            luxeList.push({ ...p, seriesTitle: 'Luxe Series' });
          } else if (
            col.includes('panel') || col.includes('solid') || col.includes('hollow') ||
            col.includes('decor') || col.includes('accessor') || col.includes('profile')
          ) {
            essentialList.push({ ...p, seriesTitle: 'Essential Series' });
          }
        }

        const pick = (arr: Item[]) => arr[Math.floor(Math.random() * arr.length)];
        
        const newItems: Item[] = [];
        if (craftList.length > 0) newItems.push(pick(craftList));
        if (luxeList.length > 0) newItems.push(pick(luxeList));
        if (essentialList.length > 0) newItems.push(pick(essentialList));

        if (newItems.length === 3) {
          setItems(newItems);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto text-center mb-16">
        <h1 className="text-4xl lg:text-6xl font-['Playfair_Display'] text-[#c6a87c] uppercase tracking-widest mb-6">
          Match Inspiration
        </h1>
        <p className="text-zinc-500 tracking-[0.2em] uppercase text-sm">
          Discover the perfect harmony of textures and spaces
        </p>
      </div>

      {/* Moodboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {items.map((item, i) => (
          <Link key={i} href={`/product/${item.id}`} prefetch={false} className="group cursor-pointer block">
            <div className="aspect-square bg-zinc-900 border border-white/5 overflow-hidden mb-6 relative">
              <img
                src={item.image_url}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-[#B08038]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <h3 className="text-[#c6a87c] font-medium tracking-widest uppercase text-sm mb-2">
              {item.seriesTitle}
            </h3>
            <p className="text-zinc-500 text-xs leading-relaxed uppercase tracking-wider">
              {item.collection} • {item.name}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-20 p-12 border border-white/5 bg-zinc-900/20 text-center rounded-sm">
        <p className="text-zinc-400 italic mb-4">"Interior design is a business of trust."</p>
        <Link href="/" prefetch={false} className="text-[#c6a87c] text-[10px] tracking-[0.3em] uppercase hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
