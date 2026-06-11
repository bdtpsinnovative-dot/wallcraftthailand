// src/app/product/[id]/page.tsx

import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseBall } from '@/app/lib/supabase';
import ProductDetailClient from './ProductDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ style?: string }>;
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { style } = await searchParams;

  if (!supabaseBall) {
    return notFound();
  }

  const { data: product, error } = await supabaseBall
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    return notFound();
  }

  return (
    // 🔥 แก้ตรงนี้: ลบ bg-[#fcfcfc] ออก หรือเปลี่ยนเป็น bg-transparent
    <main className="min-h-screen pt-20"> 
      <ProductDetailClient 
        product={product} 
        variants={product.product_variants || []} 
        initialStyle={style ? decodeURIComponent(style) : null}
      />
    </main>
  );
}
