import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { getCachedProduct } from '@/app/lib/public-cache';

// Full-page ISR cache for 1 year (31,536,000 seconds).
// Cleared on-demand via POST /api/revalidate whenever products are added/updated/deleted in Admin.
// Note: ?style= query param is handled on the client inside ProductDetailClient so the entire HTML page stays cached on CDN.
export const revalidate = 31536000;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const { product, error } = await getCachedProduct(id);

    if (error || !product) return notFound();

    return (
      <main className="min-h-screen pt-20">
        <ProductDetailClient
          product={product}
          variants={product.product_variants || []}
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
