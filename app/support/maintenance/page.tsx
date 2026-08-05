'use client';

import React from 'react';
import Link from 'next/link';

export default function PlaceholderPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center justify-center px-6 text-white text-center">
      
      <p className="text-[#c6a87c] text-[10px] tracking-[0.4em] uppercase mb-4">
        Wallcraft Thailand
      </p>
      
      {/* 🔴 นายเปลี่ยนชื่อหน้าตรงบรรทัดนี้นะครับ 🔴 */}
      <h1 className="text-3xl md:text-5xl font-['Playfair_Display'] text-white uppercase tracking-widest mb-6">
        ใส่ชื่อหน้าตรงนี้
      </h1>
      
      <div className="h-[1px] w-16 bg-[#c6a87c] mx-auto mb-6 opacity-50"></div>
      
      <p className="text-zinc-500 text-sm tracking-widest uppercase mb-10">
        This page is currently under construction. <br className="hidden md:block" />
        Please check back soon.
      </p>
      
      <Link href="/" prefetch={false} className="border border-white/20 px-8 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">
        Return to Home
      </Link>

    </div>
  );
}
