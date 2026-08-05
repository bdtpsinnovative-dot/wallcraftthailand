import { supabase } from '@/app/lib/supabase';
import { unstable_cache } from 'next/cache';
// 1. เพิ่ม Import notFound
import { notFound } from 'next/navigation'; 
// 2. เพิ่ม Import ProductDetailClient (ตรวจสอบ Path ด้านล่างนี้ให้ตรงกับโฟลเดอร์งานจริงของคุณด้วยนะครับ)
import ProductDetailClient from './ProductDetailClient'; 

// Cache product detail responses indefinitely to reduce repeated Supabase queries.
// Keep the public product page cached until a deployment or explicit revalidation.
export const revalidate = false;

const getCachedProduct = unstable_cache(
  async (productId: string) => {
    if (!supabase) {
      return { product: null, error: 'Supabase is not configured.' };
    }

    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants (*)')
      .eq('id', productId)
      .single();

    return {
      product: data,
      error: error?.message ?? null,
    };
  },
  ['public-product-detail-v1'],
  { revalidate: false }
);

// 3. ประกาศ Type สำหรับ PageProps (รองรับ Next.js เวอร์ชันใหม่ที่ params เป็น Promise)
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ style?: string }>;
};

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { style } = await searchParams;

  // เพิ่ม Error Handling ให้อุ่นใจขึ้น
  try {
    const { product, error } = await getCachedProduct(id);

    if (error || !product) return notFound();

    return (
      <main className="min-h-screen pt-20"> 
        <ProductDetailClient 
          product={product} 
          variants={product.product_variants || []} 
          initialStyle={style ? decodeURIComponent(style) : null}
        />
      </main>
    );
  } catch (e) {
    return (
      <div className="text-white text-center pt-20">
        พบข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
      </div>
    );
  }
}
