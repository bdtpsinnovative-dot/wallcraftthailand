'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaImage, 
  FaCloudArrowUp, 
  FaXmark,
  FaTriangleExclamation,
  FaChevronRight,
  FaWandMagicSparkles,
  FaRotate
} from 'react-icons/fa6';

type Product = {
  id?: string | number;
  product_id?: string | number;
  name: string;
  sku: string;
  description: string;
  variant_image: string;
  similarity: number;
};

export default function SearchPage() {
  // Image Upload States
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // API Results States
  const [products, setProducts] = useState<Product[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  // Alert State
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (file: File | undefined) => {
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Reset previous search results when new image is uploaded
      setProducts([]);
      setAiAnalysis(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => setIsDragging(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageChange(e.dataTransfer.files?.[0]);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedImage) {
      setIsLoading(true);
      setProducts([]);
      setAiAnalysis(null);
      
      try {
        const fileSizeMB = selectedImage.size / 1024 / 1024;
        console.log(`ขนาดไฟล์ก่อนส่ง: ${fileSizeMB.toFixed(2)} MB`);

        const formData = new FormData();
        formData.append('image', selectedImage);

        const response = await fetch('/api/v1/ai-assistant', {
          method: 'POST',
          body: formData
        });
        
        if (response.status === 413) {
          throw new Error("รูปภาพมีขนาดใหญ่เกินไป (เกินลิมิตเซิร์ฟเวอร์) กรุณาครอปหรือใช้รูปที่เล็กลงครับ");
        }
        
        if (!response.ok) {
           throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (รหัส ${response.status})`);
        }
        
        const data = await response.json();
        
        setProducts(data.products || []);
        setAiAnalysis(data.ai_analysis || null);

      } catch (error: any) {
        console.error("Search error:", error);
        setAlertMessage(`ไม่สามารถค้นหาได้: ${error.message || 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ'}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-24 md:py-32 flex flex-col items-center text-white relative">
      
      {/* 🛑 Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-[#1c1c1e] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <FaTriangleExclamation className="text-red-400 text-2xl" />
              <h3 className="text-white font-bold text-lg">แจ้งเตือน</h3>
            </div>
            <p className="text-white/70 leading-relaxed mb-6">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)}
                className="text-[#c6a87c] font-bold px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Header */}
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-4xl lg:text-6xl font-['Playfair_Display'] text-[#c6a87c] uppercase tracking-widest mb-4">
          AI Image Search
        </h1>
        <p className="text-zinc-500 tracking-[0.2em] uppercase text-sm px-4">
          อัปโหลดรูปภาพเพื่อค้นหาสินค้าที่ใกล้เคียงที่สุดในคลังของเรา
        </p>
      </div>

      {/* Main Search Layout */}
      <div className="w-full max-w-2xl">
        
        {/* Search Card */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
          {/* Card Header (แทนที่ Tabs) */}
          <div className="flex border-b border-white/10 bg-white/5 justify-center py-5">
            <span className="text-[#c6a87c] text-xs tracking-[0.15em] uppercase font-bold flex items-center justify-center gap-3">
              <FaImage className="text-lg" />
              Visual Search
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} className="p-6 md:p-10">
            <div className="flex flex-col gap-6">
              {!previewUrl ? (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-72 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-5 cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-[#c6a87c] bg-[#c6a87c]/10' 
                      : 'border-white/10 bg-black/50 hover:border-[#c6a87c]/50 hover:bg-white/5'
                  }`}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={(e) => handleImageChange(e.target.files?.[0])}
                    className="hidden" 
                  />
                  <div className="p-4 rounded-full bg-white/5 text-[#c6a87c]">
                    <FaCloudArrowUp className="text-4xl" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-white font-medium mb-2">แตะเพื่ออัปโหลด หรือลากรูปมาวางที่นี่</p>
                    <p className="text-zinc-500 text-xs tracking-widest uppercase">รองรับ JPG, PNG, WEBP</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-white/10 bg-black flex justify-center items-center group">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-70"
                  />
                  {/* Gradient overlay for better button visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                  
                  {/* Change Image Button Overlay */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  >
                    <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 flex items-center gap-3">
                      <FaRotate className="text-white" />
                      <span className="text-white font-bold text-sm">เปลี่ยนรูปภาพ</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      onChange={(e) => handleImageChange(e.target.files?.[0])}
                      className="hidden" 
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(null);
                      setPreviewUrl(null);
                      setProducts([]);
                      setAiAnalysis(null);
                    }}
                    className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-red-400 hover:border-red-400/50 p-2.5 rounded-full transition-all z-20"
                  >
                    <FaXmark className="text-lg" />
                  </button>
                </div>
              )}

              <button 
                type="submit"
                disabled={!selectedImage || isLoading}
                className={`w-full py-5 rounded-xl font-bold tracking-[0.2em] uppercase text-sm transition-all flex justify-center items-center gap-3 ${
                  selectedImage 
                    ? 'bg-gradient-to-r from-[#c6a87c] to-[#a4885c] hover:shadow-[0_0_20px_rgba(198,168,124,0.4)] text-black' 
                    : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    AI is scanning...
                  </>
                ) : 'START SEARCH'}
              </button>
            </div>
          </form>
        </div>

        {/* 💡 AI Advice Box (If no products found but AI has an analysis) */}
        {aiAnalysis && products.length === 0 && (
          <div className="mt-8 bg-[#1c1c1e] p-5 md:p-6 rounded-2xl border border-amber-500/30 flex gap-4 items-start shadow-lg animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-2.5 bg-amber-500/10 rounded-full shrink-0 mt-0.5">
              <FaWandMagicSparkles className="text-amber-400 text-lg" />
            </div>
            <p className="text-amber-400/90 text-sm md:text-base leading-relaxed">
              {aiAnalysis}
            </p>
          </div>
        )}

        {/* 🪵 Product Results List */}
        {products.length > 0 && (
          <div className="mt-10 animate-in slide-in-from-bottom-8 duration-500">
            <h3 className="text-white text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-[#c6a87c] rounded-full inline-block"></span>
              Best Matches
            </h3>
            
            <div className="flex flex-col gap-4">
              {products.map((p, idx) => {
                const score = p.similarity * 100;
                const isHighMatch = score >= 60;
                
                const id = p.product_id || p.id || '';
                const href = `/product/${id}?style=${encodeURIComponent(p.sku)}`;

                return (
                  <Link 
                    key={idx} 
                    href={href}
                    className="bg-[#1c1c1e]/80 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/10 hover:border-white/10 hover:-translate-y-1 transition-all shadow-lg"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-white/5">
                      <img src={p.variant_image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="text-white font-bold text-base md:text-lg truncate">{p.name}</h4>
                      <p className="text-zinc-500 text-xs md:text-sm mt-1">SKU: {p.sku || '-'}</p>
                      
                      {/* Match Badge */}
                      <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isHighMatch 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        Match: {score.toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <div className="shrink-0 px-2 text-zinc-600">
                      <FaChevronRight />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Spacer for bottom scrolling */}
        <div className="h-20"></div>
        
      </div>
    </div>
  );
}