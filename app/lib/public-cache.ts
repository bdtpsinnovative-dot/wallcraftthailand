import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';

// 1 year in seconds (365 days)
export const ONE_YEAR_SECONDS = 31536000;

export const CACHE_TAGS = {
  PRODUCTS: 'wallcraft-products',
  COLLECTIONS: 'wallcraft-collections',
  INSPIRATION: 'wallcraft-inspiration',
  SITEMAP: 'wallcraft-sitemap',
  MASTER_DATA: 'wallcraft-master-data',
  CHECK_UPDATE: 'wallcraft-check-update',
} as const;

export const CLOUDFLARE_PUBLIC_API_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400',
  'Cloudflare-CDN-Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
};

export function productCacheTag(productId: string | number): string {
  return `wallcraft-product:${String(productId)}`;
}

export function collectionCacheTag(collectionName: string): string {
  return `wallcraft-collection:${collectionName.trim().toLowerCase()}`;
}

function getServiceSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

// ============================================================
// Mobile App Shared / Public Read-Only API Caches (1 Year)
// ============================================================

export interface MobileProductsQuery {
  keyword: string;
  page: number;
  limit: number;
  collection: string;
  collectionsGroup: string;
}

export async function getCachedMobileProducts(params: MobileProductsQuery) {
  const keyParts = [
    'mobile-api-products-v1',
    `kw:${params.keyword.trim().toLowerCase()}`,
    `p:${params.page}`,
    `l:${params.limit}`,
    `c:${params.collection.trim().toLowerCase()}`,
    `cg:${params.collectionsGroup.trim().toLowerCase()}`,
  ];

  const cachedFn = unstable_cache(
    async () => {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Server Config Error: Missing Supabase Env Variables');
      }

      const offset = (params.page - 1) * params.limit;
      let url = `${supabaseUrl}/rest/v1/products?select=*,product_variants(*)&order=id.asc&limit=${params.limit}&offset=${offset}`;

      if (params.keyword) {
        const safeKeyword = encodeURIComponent(`*${params.keyword}*`);
        url += `&or=(name.ilike.${safeKeyword},collection.ilike.${safeKeyword})`;
      }

      if (params.collection) {
        url += `&collection=eq.${encodeURIComponent(params.collection)}`;
      } else if (params.collectionsGroup) {
        const formattedIn = params.collectionsGroup
          .split(',')
          .map((c) => `"${c.trim()}"`)
          .join(',');
        url += `&collection=in.(${encodeURIComponent(formattedIn)})`;
      }

      const response = await fetch(url, {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Supabase Error: ${response.status}`);
      }

      const rawData = await response.json();

      return rawData.map((item: any) => {
        const variants = item.product_variants || [];
        let minPrice = 0;
        let maxPrice = 0;

        if (variants.length > 0) {
          const prices = variants.map((v: any) => Number(v.price || 0));
          minPrice = Math.min(...prices);
          maxPrice = Math.max(...prices);
        }

        const imageUrl =
          item.image_url || (variants.length > 0 ? variants[0].variant_image : '');

        return {
          id: item.id,
          name: item.name || 'ไม่มีชื่อสินค้า',
          collection: item.collection || '',
          image: imageUrl,
          minPrice,
          maxPrice,
          variants,
        };
      });
    },
    keyParts,
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.COLLECTIONS],
    }
  );

  return cachedFn();
}

export const getCachedMobileCollections = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const { data, error } = await client.rpc('get_unique_collections');
    if (error) throw error;

    return (data || []).map((item: any) => item.collection_name);
  },
  ['mobile-api-collections-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.COLLECTIONS],
  }
);

export const getCachedCategories = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const { data, error } = await client
      .from('product_categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ['mobile-api-categories-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.MASTER_DATA],
  }
);

export const getCachedProjectTypes = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const { data, error } = await client
      .from('project_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ['mobile-api-project-types-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.MASTER_DATA],
  }
);

export const getCachedCustomerTypes = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const { data, error } = await client
      .from('customer_types')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ['mobile-api-customer-types-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.MASTER_DATA],
  }
);

export const DEFAULT_APP_UPDATE_DATA = {
  // เอาไว้สำหรับแอปเวอร์ชันเก่าที่ยังไม่ได้อัปเดตโค้ดใหม่ จะได้ไม่พัง
  latest_version: '2.0.0',
  latest_version_android: '2.2.0',
  latest_version_ios: '2.0.7',
  download_url_android: 'https://app.wallcraftthailand.com/app-release.apk',
  download_url_ios: 'https://testflight.apple.com/join/BXMvdwVM',
  force_update_android: false,
  force_update_ios: false,
  release_date: '2026-11-12',
  change_log:
    'เพิ่มระบบบันทึกประวัติการโทรทุกเบอร์อัตโนมัติ, ขอสิทธิ์ Caller ID ตั้งแต่เปิดแอป, ย้ายสมุดเบอร์ไว้ในตั้งค่าบัญชี และปรับ UI โทนเข้มเรียบหรู',
};

export const getCachedAppUpdateSettings = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) return DEFAULT_APP_UPDATE_DATA;

    const { data, error } = await client
      .from('app_release_settings')
      .select(
        'latest_version_android, download_url_android, force_update_android, latest_version_ios, download_url_ios, force_update_ios, release_date, change_log'
      )
      .eq('id', 'wallcraft_mobile')
      .maybeSingle();

    if (error || !data) {
      if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
        console.warn('[check-update] Fallback to defaults:', error.message);
      }
      return DEFAULT_APP_UPDATE_DATA;
    }

    return {
      latest_version: DEFAULT_APP_UPDATE_DATA.latest_version,
      latest_version_android:
        data.latest_version_android || DEFAULT_APP_UPDATE_DATA.latest_version_android,
      latest_version_ios:
        data.latest_version_ios || DEFAULT_APP_UPDATE_DATA.latest_version_ios,
      download_url_android:
        data.download_url_android || DEFAULT_APP_UPDATE_DATA.download_url_android,
      download_url_ios:
        data.download_url_ios || DEFAULT_APP_UPDATE_DATA.download_url_ios,
      force_update_android: Boolean(data.force_update_android),
      force_update_ios: Boolean(data.force_update_ios),
      release_date: data.release_date || DEFAULT_APP_UPDATE_DATA.release_date,
      change_log: data.change_log ?? DEFAULT_APP_UPDATE_DATA.change_log,
    };
  },
  ['mobile-api-check-update-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.CHECK_UPDATE],
  }
);

export async function purgeCloudflareZoneCache(): Promise<{
  purged: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!zoneId || !apiToken) {
    return {
      purged: false,
      skipped: true,
      error: 'CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not configured',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      errors?: Array<{ message?: string }>;
    };

    if (!res.ok || data.success === false) {
      const cfMsg =
        data.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
        `HTTP ${res.status}`;
      return {
        purged: false,
        error: `Cloudflare Purge failed: ${cfMsg}`,
      };
    }

    return { purged: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      purged: false,
      error: `Cloudflare Purge error: ${msg}`,
    };
  }
}
