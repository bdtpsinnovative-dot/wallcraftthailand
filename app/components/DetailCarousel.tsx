'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface DetailCarouselProps {
  items: any[];
  selectedItem: string;
  onSelect: (item: string) => void;
}

export default function DetailCarousel({ items, selectedItem, onSelect }: DetailCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const itemsToShow = 3; 
  const maxIndex = Math.max(0, items.length - itemsToShow);

  useEffect(() => {
    const selectedIdx = items.findIndex(item => item.name === selectedItem);
    if (selectedIdx !== -1) {
        let targetIndex = selectedIdx - 1;
        targetIndex = Math.max(0, Math.min(targetIndex, maxIndex));
        setCurrentIndex(targetIndex);
    }
  }, [selectedItem, items.length, maxIndex]);

  const next = () => {
    if (currentIndex < maxIndex) setCurrentIndex(prev => prev + 1);
  };

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= maxIndex;

  if (items.length <= itemsToShow) {
    return (
      <div className="flex gap-2">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect(item.name)}
            className={`
                block aspect-square w-1/3 rounded-sm overflow-hidden border transition-all duration-200 
                ${selectedItem === item.name 
                    ? 'border-[#c6a87c] scale-105 ring-1 ring-[#c6a87c]' 
                    : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                }
            `}
          >
            {/* ✅ แก้ไข alt ตรงนี้ */}
            <img src={item.image} className="w-full h-full object-cover" alt={`ระแนงไม้ ผนังตกแต่งบ้าน ดีไซน์ลาย ${item.name} แบรนด์ Wallcraft`} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 select-none">
      
      <button 
        onClick={prev}
        disabled={isAtStart}
        className={`p-1 transition-colors flex-shrink-0 ${isAtStart ? 'text-zinc-700 cursor-not-allowed' : 'text-[#c6a87c] hover:bg-white/5 cursor-pointer'}`}
      >
        <FaChevronLeft size={16} />
      </button>

      <div className="overflow-hidden flex-1">
         <div 
           className="flex transition-transform duration-500 ease-out" 
           style={{ transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)` }}
         >
            {items.map((item) => (
               <div key={item.name} className="flex-shrink-0 w-1/3 px-1">
                  <button
                    onClick={() => onSelect(item.name)}
                    title={item.name}
                    className={`
                        block aspect-square w-full rounded-sm overflow-hidden border transition-all duration-300
                        ${selectedItem === item.name 
                            ? 'border-[#c6a87c] scale-105 ring-1 ring-[#c6a87c] shadow-lg z-10 relative' 
                            : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                        }
                    `}
                  >
                    {/* ✅ แก้ไข alt ตรงนี้ */}
                    <img src={item.image} className="w-full h-full object-cover" alt={`วัสดุระแนงไม้ ผนังตกแต่งบ้าน Wallcraft รุ่นลาย ${item.name}`} />
                  </button>
               </div>
            ))}
         </div>
      </div>

      <button 
        onClick={next}
        disabled={isAtEnd}
        className={`p-1 transition-colors flex-shrink-0 ${isAtEnd ? 'text-zinc-700 cursor-not-allowed' : 'text-[#c6a87c] hover:bg-white/5 cursor-pointer'}`}
      >
        <FaChevronRight size={16} />
      </button>

    </div>
  ); 
}