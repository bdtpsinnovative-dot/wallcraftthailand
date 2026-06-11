'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaMagnifyingGlassPlus, FaXmark } from 'react-icons/fa6';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import DetailCarousel from '../../components/DetailCarousel'; 
import { supabase } from '@/app/lib/supabase';


interface ProductVariant {
  pattern?: string;
  color?: string;
  film?: string;
  variant_image?: string;
  cad_url?: string;
  price?: number;
  sku?: string;
  width_mm?: number;
  length_mm?: number;
  thickness_mm?: number;
  description?: string;
}

interface ProductDetailClientProps {
    
  product: any;
  variants: ProductVariant[];
  initialStyle?: string | null;
}

export default function ProductDetailClient({ product, variants, initialStyle }: ProductDetailClientProps) {
  const filteredVariants = initialStyle 
    ? variants.filter(v => (v.pattern || v.color) === initialStyle)
    : variants;
  const router = useRouter();
  const displayVariants = filteredVariants.length > 0 ? filteredVariants : variants;

  const groupedData: Record<string, Record<string, ProductVariant[]>> = {};
  displayVariants.forEach((v) => {
    const pName = v.pattern || v.color || 'Default';
    const fName = v.film || 'Standard';
    if (!groupedData[pName]) groupedData[pName] = {};
    if (!groupedData[pName][fName]) groupedData[pName][fName] = [];
    groupedData[pName][fName].push(v);
  });

  const patterns = Object.keys(groupedData).sort();
  const [selectedPattern, setSelectedPattern] = useState(patterns[0]);

  const currentFilms = selectedPattern ? groupedData[selectedPattern] ?? {} : {};
  const filmOptions = Object.keys(currentFilms);
  const firstFilm = filmOptions[0] || '';
  const [selectedFilm, setSelectedFilm] = useState(firstFilm);

  const currentVariants = selectedFilm ? currentFilms[selectedFilm] ?? [] : [];
  const firstVariant = currentVariants[0] || null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(firstVariant);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (selectedPattern && groupedData[selectedPattern]) {
      const films = Object.keys(groupedData[selectedPattern]);
      if (films.length > 0) {
        const nextFilm = films[0];
        setSelectedFilm(nextFilm);
        setSelectedVariant(groupedData[selectedPattern][nextFilm][0]);
      } else {
        setSelectedFilm('');
        setSelectedVariant(null);
      }
    }
  }, [selectedPattern]);

  useEffect(() => {
    if (selectedPattern && selectedFilm && groupedData[selectedPattern]?.[selectedFilm]) {
       setSelectedVariant(groupedData[selectedPattern][selectedFilm][0]);
    } else if (selectedFilm) {
      setSelectedVariant(null);
    }
  }, [selectedFilm]);

  // 1. Setup State
  const [isSaved, setIsSaved] = useState(false);

  // 2. Check status on load (using Primary Supabase)
  useEffect(() => {
    const checkStatus = async () => {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedVariant?.sku) return;

      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('variant_sku', selectedVariant.sku)
        .maybeSingle();

      setIsSaved(!!data);
    };
    checkStatus();
  }, [selectedVariant?.sku]);

  // 3. Toggle Save (Writing to Primary Supabase)
  const handleToggleSave = async () => {
    if (!supabase) return alert("Supabase is not configured.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please login to save textures.");

    if (isSaved) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('variant_sku', selectedVariant?.sku);
        
      if (!error) setIsSaved(false);
    } else {
      const { error } = await supabase.from('user_favorites').insert({
        user_id: user.id,
        product_id: product.id,
        variant_sku: selectedVariant?.sku,
        collection_name: product.collection
      });
      
      if (!error) setIsSaved(true);
    }
  };
  // 🔥 2. เตรียมข้อมูลสำหรับส่งให้ Carousel (แปลง patterns เป็น object ที่มี name และ image)
  const carouselItems = patterns.map(p => {
      const representFilm = Object.keys(groupedData[p])[0];
      const representImg = groupedData[p][representFilm][0].variant_image;
      return { name: p, image: representImg };
  });

  if (!selectedVariant || patterns.length === 0) return <div className="p-10 text-center text-white">No product data found.</div>;

  return (
    <div className="bg-[#121212] min-h-screen pt-32 pb-20 font-['Sarabun'] text-white">
      <div className="max-w-[1400px] mx-auto px-6">
        
        {/* Back Button */}
        <button
  onClick={() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }}
  className="inline-flex items-center text-zinc-400 hover:text-[#c6a87c] mb-8 transition-colors text-sm font-bold"
>
  <FaChevronLeft className="mr-2 text-xs" />
  กลับหน้าก่อนหน้า
</button>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          
          
          {/* Left: Main Image - Only sticky on large screens (desktop) */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-32">
            <div className="bg-[#1a1a1a] rounded-sm border border-white/5 aspect-square flex items-center justify-center relative overflow-hidden shadow-xl">
               <img 
                src={selectedVariant?.variant_image || product.image_url} 
                alt={product.name} 
                className="w-full h-full object-contain p-4 lg:p-8 transition-all duration-500"
              />
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="w-full lg:w-1/2 space-y-6">
            <header className="border-b border-white/10 pb-8">
              <p className="text-[37px] text-[#c6a87c] tracking-[0.2em] uppercase font-semibold">
                 {product.collection || 'Collection'}
              </p>
              <h1 className="text-3xl font-['Playfair_Display'] mt-1">{product.name}</h1>
              <p className="text-zinc-400 leading-relaxed font-light text-base">{selectedVariant?.description || '-'}</p>
            </header>

            {/* Style Selection (Carousel) */}
            <section>
              <h4 className="text-[0.7rem] font-bold text-zinc-500 mb-4 uppercase tracking-widest">
                STYLE: <span className="text-white ml-2">{selectedPattern}</span>
              </h4>
              
              {/* 🔥 3. แทนที่ Grid เดิม ด้วย Carousel ใหม่ */}
              <div className="w-full max-w-[450px]"> {/* คุมความกว้างไม่ให้ยาวเกิน */}
                  <DetailCarousel 
                      items={carouselItems} 
                      selectedItem={selectedPattern} 
                      onSelect={setSelectedPattern} 
                  />
              </div>
            </section>

            {/* Film & CAD Section */}
            <section>
              <div className="flex justify-between items-end mb-4">
                <h4 className="text-[0.7rem] font-bold text-zinc-500 uppercase tracking-widest">SELECT FILM TYPE</h4>
                {selectedVariant?.cad_url && (
                   <div className="group relative">
                     <img 
                       src={selectedVariant.cad_url} 
                       onClick={() => setIsModalOpen(true)}
                       className="h-[40px] w-auto border border-white/20 p-1 bg-white/5 rounded cursor-zoom-in hover:scale-110 transition-transform" 
                       alt="CAD Preview" 
                     />
                     <span className="absolute bottom-full right-0 mb-2 text-[10px] bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">View CAD</span>
                   </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3">
                {filmOptions.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelectedFilm(f)}
                    className={`px-6 py-3 rounded-sm text-sm border cursor-pointer transition-all ${selectedFilm === f ? 'bg-white text-black border-white font-bold' : 'bg-transparent text-zinc-400 border-white/20 hover:border-white/50'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </section>

            {/* Size & Buy Section */}
            <section className="bg-[#1a1a1a] p-8 rounded-sm border border-white/5">
              <h4 className="text-[0.7rem] font-bold text-zinc-500 mb-3 uppercase tracking-widest">SELECT DIMENSION</h4>
              <select 
                className="w-full bg-[#121212] border border-white/10 text-white p-4 rounded-sm mb-6 text-base outline-none focus:border-[#c6a87c] appearance-none cursor-pointer"
                onChange={(e) => setSelectedVariant(JSON.parse(e.target.value))}
                value={JSON.stringify(selectedVariant)}
              >
                {currentVariants.map((v, idx) => (
                  <option key={idx} value={JSON.stringify(v)}>
                    {v.thickness_mm}mm ({v.width_mm}x{v.length_mm}mm)
                  </option>
                ))}
              </select>

              <div className="flex items-baseline justify-between mb-2">
                 <div className="text-[2.5rem] font-['Playfair_Display'] text-[#c6a87c]">
                    {selectedVariant?.price ? `฿${Number(selectedVariant.price).toLocaleString()}` : 'Contact Us'}
                 </div>
              </div>
              <div className="text-zinc-500 text-xs mb-8 tracking-wider">SKU: <span className="text-white">{selectedVariant?.sku || '-'}</span></div>
  
  <div className="space-y-3">
    <button 
      onClick={handleToggleSave}
      className={`w-full py-4 text-sm font-bold tracking-widest uppercase transition-all duration-300 border ${
        isSaved 
          ? 'bg-[#c6a87c] text-white border-[#c6a87c]' 
          : 'bg-transparent text-[#c6a87c] border-[#c6a87c]/30 hover:border-[#c6a87c]'
      }`}
    >
      {isSaved ? 'SAVED' : '♡ SAVE TO FAVORITES'}
    </button>
  </div>

              <button className="w-full bg-white text-black py-4 text-sm font-bold tracking-widest uppercase cursor-pointer hover:bg-[#c6a87c] hover:text-white transition-all duration-300">
                 Download
              </button>
            </section>
          </div>
        </div>

        {/* CAD Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-5" onClick={() => setIsModalOpen(false)}>
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-4xl"><FaXmark /></button>
            <img 
              src={selectedVariant?.cad_url} 
              className="max-w-[90%] max-h-[85vh] bg-white p-4 rounded shadow-2xl object-contain" 
              alt="CAD Fullscreen" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
