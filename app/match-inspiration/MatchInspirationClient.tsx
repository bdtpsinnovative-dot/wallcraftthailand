'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export interface InspirationItem {
  id: number | string;
  name: string;
  collection: string;
  seriesTitle: string;
  image_url: string;
}

interface MatchInspirationClientProps {
  fallbackItems: InspirationItem[];
  craftList: InspirationItem[];
  luxeList: InspirationItem[];
  essentialList: InspirationItem[];
}

export default function MatchInspirationClient({
  fallbackItems,
  craftList,
  luxeList,
  essentialList,
}: MatchInspirationClientProps) {
  const [items, setItems] = useState<InspirationItem[]>(fallbackItems);

  useEffect(() => {
    const pick = (arr: InspirationItem[]) =>
      arr[Math.floor(Math.random() * arr.length)];

    if (craftList.length > 0 && luxeList.length > 0 && essentialList.length > 0) {
      setItems([pick(craftList), pick(luxeList), pick(essentialList)]);
    }
  }, [craftList, luxeList, essentialList]);

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
          <Link
            key={`${item.id}-${i}`}
            href={`/product/${item.id}`}
            prefetch={false}
            className="group cursor-pointer block"
          >
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
        <p className="text-zinc-400 italic mb-4">
          &ldquo;Interior design is a business of trust.&rdquo;
        </p>
        <Link
          href="/"
          prefetch={false}
          className="text-[#c6a87c] text-[10px] tracking-[0.3em] uppercase hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
