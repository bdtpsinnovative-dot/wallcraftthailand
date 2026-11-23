import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';
import { getProductViewCounts } from '@/app/lib/product-views';

// 1 year in seconds (365 days)
export const ONE_YEAR_SECONDS = 31536000;

export const CACHE_TAGS = {
  PRODUCTS: 'wallcraft-products',
  COLLECTIONS: 'wallcraft-collections',
  INSPIRATION: 'wallcraft-inspiration',
  SITEMAP: 'wallcraft-sitemap',
  MASTER_DATA: 'wallcraft-master-data',
  CHECK_UPDATE: 'wallcraft-check-update',
  COMPANIES: 'wallcraft-companies',
  PROJECTS: 'wallcraft-projects',
  POOL_PROJECTS: 'wallcraft-pool-projects',
} as const;

export const CLOUDFLARE_PUBLIC_API_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400',
  'Cloudflare-CDN-Cache-Control': 'public, max-age=31536000, stale-while-revalidate=86400',
};

export const CLOUDFLARE_MOBILE_PRODUCTS_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
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

  const res = await cachedFn();
  if (res.products && res.products.length > 0) {
    const views = await getProductViewCounts();
    const sorted = [...res.products].sort((a: any, b: any) => {
      const viewsA = views[a.id] || 0;
      const viewsB = views[b.id] || 0;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return b.id - a.id;
    });
    return { ...res, products: sorted };
  }

  return res;
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

// 🌟 อัลกอริทึมจัดลำดับสินค้า: จัดกลุ่มสินค้าไฮไลท์ และแยกอุปกรณ์เสริมออกจากหน้าแรก
const TIER_1_COLLECTIONS = new Set([
  'tarra stone', 'panorama', 'strength rock', 'geo form', 'geoform',
  'urban form', 'nature grain', 'rust', 'finesse', 'wood', 'metalic',
  'metallic', 'fabric', 'leather', 'velvet', 'signature', 'stone',
  'semi outdoor', 'decor panel', 'solid panel', 'hollow core', 'hollow core panel'
]);

const ACCESSORY_COLLECTIONS = new Set([
  'accessories', 'profile', 'pvc profile', 'aluminium & led'
]);

function getProductBaseScore(collection: string, minPrice: number): number {
  const col = (collection || '').toLowerCase().trim();
  // สินค้า ฿0 หรือกลุ่ม Accessories อยู่ท้ายสุด
  if (minPrice <= 0 || ACCESSORY_COLLECTIONS.has(col)) {
    return 0;
  }
  // สินค้าหลัก / คอลเลกชัน Flagship ได้คะแนนตั้งต้น 1,000 คะแนน
  if (TIER_1_COLLECTIONS.has(col)) {
    return 1000;
  }
  return 500;
}

// แคชสินค้าทั้งหมดจาก Supabase (ไม่ดึง embedding vector เพื่อความเร็วสูง < 800ms)
const getAllMobileProducts = unstable_cache(
  async () => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server Config Error: Missing Supabase Env Variables');
    }

    const selectQuery = 'id,name,collection,image_url,created_at,product_variants(id,sku,color,film,pattern,price,thickness_mm,width_mm,length_mm,variant_image,description)';
    const url = `${supabaseUrl}/rest/v1/products?select=${encodeURIComponent(selectQuery)}`;

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
  ['all-mobile-products-v3'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.COLLECTIONS],
  }
);

export async function getCachedMobileProducts(params: MobileProductsQuery) {
  const allProducts = await getAllMobileProducts();
  const views = await getProductViewCounts();

  let filtered = allProducts;

  // กรองตามคำค้นหา (Keyword)
  if (params.keyword) {
    const kw = params.keyword.trim().toLowerCase();
    filtered = filtered.filter(
      (p: any) =>
        (p.name && p.name.toLowerCase().includes(kw)) ||
        (p.collection && p.collection.toLowerCase().includes(kw))
    );
  }

  // กรองตามหมวดหมู่ (Collection)
  if (params.collection) {
    const targetCol = params.collection.trim().toLowerCase();
    filtered = filtered.filter(
      (p: any) => p.collection && p.collection.trim().toLowerCase() === targetCol
    );
  } else if (params.collectionsGroup) {
    const group = new Set(
      params.collectionsGroup.split(',').map((c) => c.trim().toLowerCase())
    );
    filtered = filtered.filter(
      (p: any) => p.collection && group.has(p.collection.trim().toLowerCase())
    );
  }

  // 🌟 เรียงลำดับตามความนิยม (Algorithm: คะแนนพื้นฐาน + ยอดกดดูบ่อย * 50)
  filtered = [...filtered].sort((a: any, b: any) => {
    const viewsA = views[a.id] || 0;
    const viewsB = views[b.id] || 0;
    const scoreA = getProductBaseScore(a.collection, a.minPrice) + viewsA * 50;
    const scoreB = getProductBaseScore(b.collection, b.minPrice) + viewsB * 50;

    // 1. เรียงตามคะแนนรวม (ยอดดู + ความสำคัญของกลุ่มสินค้า)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // 2. เรียงตามยอดเข้าชมสินค้าโดยตรง
    if (viewsB !== viewsA) {
      return viewsB - viewsA;
    }
    // 3. สินค้าที่มีราคาแสดงก่อนสินค้าราคา 0
    if ((b.minPrice > 0 ? 1 : 0) !== (a.minPrice > 0 ? 1 : 0)) {
      return (b.minPrice > 0 ? 1 : 0) - (a.minPrice > 0 ? 1 : 0);
    }
    // 4. สินค้าใหม่มาก่อน (ID ล่าสุด)
    return b.id - a.id;
  });

  // แบ่งหน้า (Pagination)
  const offset = (params.page - 1) * params.limit;
  return filtered.slice(offset, offset + params.limit);
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

// ============================================================
// Companies, Projects, New Record & Pool Server Caches (1 Year)
// ============================================================

export async function getCachedCompanies(params: { q: string; typeId: string }) {
  const keyParts = [
    'mobile-api-companies-v1',
    `q:${params.q.trim().toLowerCase()}`,
    `t:${params.typeId.trim()}`,
  ];

  const cachedFn = unstable_cache(
    async () => {
      const client = getServiceSupabase();
      if (!client) throw new Error('Missing Supabase config');

      let query = client.from('companies').select('id, name, customer_type_id');
      if (params.q) query = query.ilike('name', `%${params.q}%`);
      if (
        params.typeId &&
        params.typeId !== 'null' &&
        params.typeId !== 'undefined'
      ) {
        query = query.eq('customer_type_id', params.typeId);
      }

      const { data, error } = await query
        .order('name', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    keyParts,
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [CACHE_TAGS.COMPANIES],
    }
  );

  return cachedFn();
}

export const getCachedProjects = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const { data, error } = await client
      .from('projects')
      .select('id, project_name')
      .order('project_name', { ascending: true })
      .limit(100);

    if (error) throw error;
    return data || [];
  },
  ['mobile-api-projects-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.PROJECTS],
  }
);

export const getCachedNewRecordBootstrap = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const fetchAllProjects = async () => {
      const batchSize = 1000;
      const allProjects: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await client
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        if (error || !data || data.length === 0) break;
        allProjects.push(...data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allProjects;
    };

    const [customerTypes, productCategories, projects, projectTypes] =
      await Promise.all([
        client.from('customer_types').select('*').order('created_at'),
        client.from('product_categories').select('*').order('created_at'),
        fetchAllProjects(),
        client.from('project_types').select('*').order('id'),
      ]);

    return {
      customer_types: customerTypes.data || [],
      product_categories: productCategories.data || [],
      projects: projects || [],
      project_types: projectTypes.data || [],
    };
  },
  ['mobile-api-new-record-bootstrap-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.PROJECTS, CACHE_TAGS.MASTER_DATA],
  }
);

export const getCachedPoolFilters = unstable_cache(
  async () => {
    const client = getServiceSupabase();
    if (!client) throw new Error('Missing Supabase config');

    const [categoriesRes, projectTypesRes, profilesRes] = await Promise.all([
      client.from('product_categories').select('name').order('name'),
      client.from('project_types').select('name').order('name'),
      client
        .from('profiles')
        .select('full_name')
        .not('full_name', 'is', null)
        .order('full_name'),
    ]);

    return {
      categories: categoriesRes.data?.map((c: any) => c.name) || [],
      projectTypes: projectTypesRes.data?.map((p: any) => p.name) || [],
      saleNames: profilesRes.data?.map((p: any) => p.full_name) || [],
    };
  },
  ['mobile-api-pool-filters-v1'],
  {
    revalidate: ONE_YEAR_SECONDS,
    tags: [CACHE_TAGS.MASTER_DATA, CACHE_TAGS.POOL_PROJECTS],
  }
);

export interface PoolProjectsCacheParams {
  page: number;
  limit: number;
  scope: string;
  userId: string;
  teamId: string;
  searchKeyword: string;
  categories: string;
  sales: string;
  types: string;
  areas: string;
  dateRange: string;
  isImportant: boolean;
}

export async function getCachedPoolProjects(params: PoolProjectsCacheParams) {
  // Include scope owner ONLY when needed so 'all' shares one cache entry across authorized users,
  // 'team' shares within the same team, and 'mine' is isolated per user.
  const scopeOwnerKey =
    params.scope === 'mine'
      ? `u:${params.userId}`
      : params.scope === 'team'
        ? `t:${params.teamId || 'none'}`
        : 'all';

  // Include current Bangkok date when a relative dateRange filter is active
  const dateKey = params.dateRange
    ? new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)
    : '';

  const keyParts = [
    'mobile-api-pool-projects-v1',
    `sc:${params.scope}:${scopeOwnerKey}`,
    `p:${params.page}`,
    `l:${params.limit}`,
    `q:${params.searchKeyword.trim().toLowerCase()}`,
    `cat:${params.categories}`,
    `sal:${params.sales}`,
    `typ:${params.types}`,
    `ar:${params.areas}`,
    `dr:${params.dateRange}:${dateKey}`,
    `imp:${params.isImportant ? '1' : '0'}`,
  ];

  const cachedFn = unstable_cache(
    async () => {
      const client = getServiceSupabase();
      if (!client) throw new Error('Missing Supabase config');

      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;

      const selectCategories = params.categories
        ? 'product_categories!inner(name)'
        : 'product_categories(name)';
      const selectProjectTypes = params.types
        ? 'project_types!inner(name)'
        : 'project_types(name)';
      const selectProfiles = params.sales
        ? 'profiles!inner(full_name, teams(team_name))'
        : 'profiles(full_name, teams(team_name))';

      let query = client
        .from('order_items')
        .select(
          `
          *,
          ${selectCategories},
          order_item_projects!inner(
            id,
            area_sqm,
            project_name,
            is_important,
            project_type_id,
            queue_level,
            project_year,
            ${selectProjectTypes},
            account_developer,
            contact_developer,
            account_architecture,
            contact_architecture,
            account_interior,
            contact_interior,
            account_contractor,
            contact_contractor,
            is_deleted
          ),
          orders!inner(
            id,
            created_at,
            customer_name,
            phone,
            customer_types(name),
            is_synced,
            audit_log,
            admin_edits,
            user_id,
            team_id,
            ${selectProfiles},
            companies(name, customer_types(name))
          )
        `,
          { count: 'exact' }
        )
        .eq('order_item_projects.is_deleted', false)
        .order('created_at', { ascending: false });

      if (params.scope === 'mine') {
        query = query.eq('orders.user_id', params.userId);
      } else if (params.scope === 'team' && params.teamId) {
        query = query.eq('orders.team_id', params.teamId);
      }

      if (params.searchKeyword.trim() !== '') {
        const kw = params.searchKeyword.trim();
        query = query.or(
          `project_name.ilike.%${kw}%,account_developer.ilike.%${kw}%,account_architecture.ilike.%${kw}%,account_interior.ilike.%${kw}%,account_contractor.ilike.%${kw}%`,
          { foreignTable: 'order_item_projects' }
        );
      }

      if (params.categories) {
        query = query.in('product_categories.name', params.categories.split(','));
      }

      if (params.sales) {
        query = query.in('orders.profiles.full_name', params.sales.split(','));
      }

      if (params.types) {
        query = query.in(
          'order_item_projects.project_types.name',
          params.types.split(',')
        );
      }

      if (params.isImportant) {
        query = query.eq('order_item_projects.is_important', true);
      }

      if (params.dateRange) {
        const now = new Date();
        let daysToSubtract = 0;

        if (params.dateRange === '7 วันล่าสุด') daysToSubtract = 7;
        else if (params.dateRange === '14 วันล่าสุด') daysToSubtract = 14;
        else if (params.dateRange === '30 วันล่าสุด') daysToSubtract = 30;

        if (daysToSubtract > 0) {
          now.setDate(now.getDate() - daysToSubtract);
          query = query.gte('orders.created_at', now.toISOString());
        }
      }

      if (params.areas) {
        const areaArray = params.areas.split(',');
        const orConditions: string[] = [];

        for (const range of areaArray) {
          if (range === 'น้อยกว่า 50 sq.m.') orConditions.push('area_sqm.lt.50');
          else if (range === '50 - 200 sq.m.')
            orConditions.push('and(area_sqm.gte.50,area_sqm.lte.200)');
          else if (range === '201 - 500 sq.m.')
            orConditions.push('and(area_sqm.gte.201,area_sqm.lte.500)');
          else if (range === 'มากกว่า 500 sq.m.') orConditions.push('area_sqm.gt.500');
        }

        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','), {
            foreignTable: 'order_item_projects',
          });
        }
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      const normalizedData = (data || []).map((item: any) => {
        if (item.orders) {
          const projects = Array.isArray(item.order_item_projects)
            ? item.order_item_projects
            : [];
          let fallbackComp = '';
          for (const p of projects) {
            fallbackComp =
              p.account_developer ||
              p.account_architecture ||
              p.account_interior ||
              p.account_contractor ||
              '';
            if (fallbackComp) break;
          }

          const existingCompanyName = item.orders.companies?.name || '';
          const effectiveCompanyName = existingCompanyName || fallbackComp;
          const customerName = (item.orders.customer_name || '').trim();

          const finalName = effectiveCompanyName || customerName;

          if (finalName) {
            item.orders.companies = {
              ...(item.orders.companies || {}),
              name: finalName,
            };
          }
        }
        return item;
      });

      return {
        data: normalizedData,
        total: count,
        page: params.page,
        limit: params.limit,
      };
    },
    keyParts,
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [CACHE_TAGS.POOL_PROJECTS],
    }
  );

  return cachedFn();
}
