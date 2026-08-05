'use client';
import React from 'react';
import Link from 'next/link';

export default function MatchInspirationPage() {
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="group cursor-pointer">
            <div className="aspect-square bg-zinc-900 border border-white/5 overflow-hidden mb-6 relative">
              <div className="absolute inset-0 flex items-center justify-center text-zinc-800 uppercase tracking-widest text-xs">
                Inspiration Look {i}
              </div>
              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-[#B08038]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            <h3 className="text-[#c6a87c] font-medium tracking-widest uppercase text-sm mb-2">Modern Minimalist</h3>
            <p className="text-zinc-500 text-xs leading-relaxed uppercase tracking-wider">Terra Stone + Solid Wood Elements</p>
          </div>
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
