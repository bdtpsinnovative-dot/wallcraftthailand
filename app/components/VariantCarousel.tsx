'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface VariantCarouselProps {
  variants: any[];
  productId: number;
}

export default function VariantCarousel({ variants, productId }: VariantCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsToShow = 3; 

  const maxIndex = Math.max(0, variants.length - itemsToShow);

  const next = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= maxIndex;

  if (variants.length <= itemsToShow) {
    return (
      <div className="flex gap-4">
        {variants.map((v, idx) => {
          const name = v.pattern || v.color || v.sku || 'พรีเมียม';
          return (
            <Link 
              key={idx} 
              href={`/product/${productId}?style=${encodeURIComponent(v.pattern || v.color || v.sku)}`}
              className="block aspect-square w-1/3 border border-[#444] rounded-sm hover:border-[#c6a87c] hover:scale-105 transition-all overflow-hidden"
            >
               {/* ✅ แก้ไข alt ตรงนี้ */}
               <img src={v.variant_image} alt={`ผนังตกแต่งบ้าน ระแนงไม้ ลาย ${name} แบรนด์ Wallcraft`} className="w-full h-full object-cover" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      
      <button 
        onClick={prev}
        disabled={isAtStart}
        className={`z-10 p-2 text-[#c6a87c] hover:text-white transition-colors ${isAtStart ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5 rounded-full'}`}
      >
        <FaChevronLeft size={16} />
      </button>

      <div className="overflow-hidden flex-1">
         <div 
           className="flex transition-transform duration-500 ease-out" 
           style={{ transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)` }}
         >
            {variants.map((v, idx) => {
               const styleName = v.pattern || v.color || v.sku;
               return (
                 <div key={idx} className="min-w-[33.333%] px-2">
                    <Link
                      href={`/product/${productId}?style=${encodeURIComponent(styleName)}`}
                      className="block aspect-square w-full border border-[#444] rounded-sm hover:border-[#c6a87c] hover:scale-105 transition-all duration-300 overflow-hidden shadow-md"
                    >
                      {/* ✅ แก้ไข alt ตรงนี้ */}
                      <img src={v.variant_image} alt={`สินค้าผนังตกแต่งบ้าน ระแนงไม้ Wallcraft ลาย ${styleName}`} className="w-full h-full object-cover" />
                    </Link>
                 </div>
               );
            })}
         </div>
      </div>

      <button 
        onClick={next}
        disabled={isAtEnd}
        className={`z-10 p-2 text-[#c6a87c] hover:text-white transition-colors ${isAtEnd ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5 rounded-full'}`}
      >
        <FaChevronRight size={16} />
      </button>

    </div>
  );
}