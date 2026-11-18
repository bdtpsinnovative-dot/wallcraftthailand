import { unstable_cache } from 'next/cache';
import { supabase } from '@/app/lib/supabase';

// 1 year in seconds (365 days)
export const ONE_YEAR_SECONDS = 31536000;

export const CACHE_TAGS = {
  PRODUCTS: 'wallcraft-products',
  COLLECTIONS: 'wallcraft-collections',
  INSPIRATION: 'wallcraft-inspiration',
  SITEMAP: 'wallcraft-sitemap',
} as const;

export function productCacheTag(productId: string | number): string {
  return `wallcraft-product:${String(productId)}`;
}

export function collectionCacheTag(collectionName: string): string {
  return `wallcraft-collection:${collectionName.trim().toLowerCase()}`;
}

export async function getCachedCollectionProducts(collectionName: string) {
  const normalized = collectionName.trim().toLowerCase();
  const cachedFn = unstable_cache(
    async () => {
      if (!supabase) {
        return { products: null, error: 'Supabase is not configured.' };
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (
            id, sku, color, film, pattern, variant_image, description
          )
        `)
        .ilike('collection', `%${collectionName}%`)
        .order('id', { ascending: true });

      return {
        products: data,
        error: error?.message ?? null,
      };
    },
    ['public-collection-products-v2', normalized],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [
        CACHE_TAGS.PRODUCTS,
        CACHE_TAGS.COLLECTIONS,
        collectionCacheTag(normalized),
      ],
    }
  );

  return cachedFn();
}

export async function getCachedProduct(productId: string) {
  const cachedFn = unstable_cache(
    async () => {
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
    ['public-product-detail-v2', String(productId)],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [CACHE_TAGS.PRODUCTS, productCacheTag(productId)],
    }
  );

  return cachedFn();
}

export const getCachedInspirationProducts = unstable_cache(
  async () => {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, name, collection, image_url')
      .not('image_url', 'is', null);

    if (error || !data) {
      return [];
    }

    return data.filter(
      (p: { image_url?: string | null }) =>
        typeof p.image_url === 'string' && p.image_url.startsWith('http')
    );
  },
  ['public-inspiration-products-v2'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.INSPIRATION],
  }
);

export const getCachedSitemapProducts = unstable_cache(
  async () => {
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, collection');

    if (error || !data) {
      return [];
    }

    return data;
  },
  ['public-sitemap-products-v2'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.SITEMAP],
  }
);
