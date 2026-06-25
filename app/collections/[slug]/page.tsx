import React from 'react';
import Link from 'next/link';

import { supabase } from '@/app/lib/supabase';
import VariantCarousel from '@/app/components/VariantCarousel';

export const dynamic = 'force-dynamic';

const SLUG_TO_COLLECTION: Record<string, string> = {
  "solid-panel": "Solid Panel", 
  "tarra-stone": "Tarra Stone", 
  "geoform": "Geo form",
  "accessories": "Accessories",
  "metallic": "Metallic"
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CollectionDynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const searchName = SLUG_TO_COLLECTION[slug] || slug.replace(/-/g, ' '); 

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (
        id, sku, color, film, pattern, variant_image, description
      )
    `)
    .ilike('collection', `%${searchName}%`)
    .order('id', { ascending: true });

  if (error || !products || products.length === 0) {
    return (
      <div className="bg-[#121212] min-h-screen text-white font-['Sarabun'] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl lg:text-6xl font-['Playfair_Display'] text-[#c6a87c] mb-6 uppercase tracking-wider">
             Coming Soon
          </h1>
          <p className="text-[#b0b0b0] font-light tracking-wide mb-10 text-lg">
             คอลเลกชัน <span className="text-white font-medium">{searchName}</span> กำลังอยู่ในช่วงอัปเดตสินค้าครับ 
             <br />โปรดติดตามเร็วๆ นี้
          </p>
          <Link href="/" className="px-8 py-3 border border-[#c6a87c] text-[#c6a87c] hover:bg-[#c6a87c] hover:text-black transition-all duration-300 text-sm tracking-[0.2em] uppercase rounded-sm inline-block">
             กลับสู่หน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] min-h-screen text-white font-['Sarabun']">
       <header className="py-20 text-center bg-black border-b border-[#222]">
          <h1 className="text-4xl lg:text-6xl font-['Playfair_Display'] text-[#c6a87c] uppercase tracking-wider">
             {searchName} 
          </h1>
       </header>

       <main className="max-w-[1200px] mx-auto px-6 py-12 space-y-16">
         {products.map((product: any) => {
            const variants = product.product_variants || [];
            const firstVariant = variants[0];
            const defaultImg = product.image_url || firstVariant?.variant_image;
            const uniqueVariants = Array.from(new Map((variants as any[]).map((v: any) => [v.pattern || v.color || v.sku, v])).values());
            
            return (
                <div key={product.id} className="group bg-[#1e1e1e] flex flex-col md:flex-row overflow-hidden hover:border hover:border-[#c6a87c] transition-all duration-300 shadow-2xl">
                    
                    <Link href={`/product/${product.id}`} className="md:flex-1 min-h-[400px] md:min-h-[450px] bg-black relative overflow-hidden">
                        {/* ✅ แก้ไข alt ตรงนี้ให้บอกชื่อรุ่นและคอลเลกชันสินค้าผนังตกแต่ง */}
                        <img src={defaultImg} alt={`ผนังตกแต่งบ้าน ระแนงไม้พรีเมียม รุ่น ${product.name} คอลเลกชัน ${searchName} แบรนด์ Wallcraft`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        
                        <div className="absolute bottom-4 left-4 z-10 bg-black/60 p-3 rounded border-l-2 border-[#c6a87c] backdrop-blur-md">
                            <h3 className="text-white text-sm font-bold m-0">{firstVariant?.sku}</h3>
                            <span className="text-white/70 text-[10px] block mt-1">{product.name}</span>
                        </div>
                    </Link>

                    <div className="md:flex-[1.2] p-8 flex flex-col justify-center">
                         <div className="border-b border-[#333] pb-4 mb-4">
                            <p className="text-[37px] text-[#c6a87c] tracking-[0.2em] uppercase font-semibold">
                                {product.name}
                            </p>
                        </div>
                         <p className="text-[#b0b0b0] text-sm font-light leading-relaxed mb-6">
                            {firstVariant?.description || '-'}
                         </p>
                         
                         <div className="space-y-3">
                            <h4 className="text-[10px] uppercase text-[#777] tracking-widest flex justify-between mb-2">
                                Available Styles
                            </h4>
                            
                            <div className="w-full max-w-[550px]"> 
                                <VariantCarousel variants={uniqueVariants} productId={product.id} />
                            </div>
                         </div>

                         <Link href={`/product/${product.id}`} className="mt-6 text-[#c6a87c] text-sm font-bold flex items-center gap-2 hover:translate-x-2 transition-transform">
                             VIEW DETAILS <span>→</span>
                         </Link>
                    </div>
                </div>
            );
         })}
       </main>
    </div>
  );
}