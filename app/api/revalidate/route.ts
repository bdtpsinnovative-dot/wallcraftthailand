import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  CACHE_TAGS,
  collectionCacheTag,
  productCacheTag,
  purgeCloudflareZoneCache,
} from '@/app/lib/public-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function timingSafeMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

function extractSecret(request: Request, body: Record<string, unknown>): string {
  const headerSecret = request.headers.get('x-revalidate-secret')?.trim();
  if (headerSecret) return headerSecret;

  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  if (typeof body.secret === 'string' && body.secret.trim()) {
    return body.secret.trim();
  }

  return '';
}

function toCollectionSlug(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  if (slug === 'terra-stone') return 'tarra-stone';
  if (slug === 'geo-form') return 'geoform';
  return slug;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.REVALIDATE_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Server configuration error: REVALIDATE_SECRET is not set.',
      },
      { status: 500 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const providedSecret = extractSecret(request, body);
  if (!providedSecret || !timingSafeMatch(providedSecret, expectedSecret)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: invalid revalidation secret.' },
      { status: 401 }
    );
  }

  const purgedTags = new Set<string>();
  const purgedPaths = new Set<string>();

  const expireTag = (tag: string) => {
    revalidateTag(tag, { expire: 0 });
    purgedTags.add(tag);
  };

  const expirePath = (path: string, type?: 'layout' | 'page') => {
    if (type) {
      revalidatePath(path, type);
      purgedPaths.add(`${path} (${type})`);
    } else {
      revalidatePath(path);
      purgedPaths.add(path);
    }
  };

  // 1. Purge all core product/catalog/master/app-update tags immediately on Vercel
  expireTag(CACHE_TAGS.PRODUCTS);
  expireTag(CACHE_TAGS.COLLECTIONS);
  expireTag(CACHE_TAGS.INSPIRATION);
  expireTag(CACHE_TAGS.SITEMAP);
  expireTag(CACHE_TAGS.MASTER_DATA);
  expireTag(CACHE_TAGS.CHECK_UPDATE);

  // 2. Collect product IDs & collections (supports both Admin payload & Supabase Database Webhook payload)
  const productIds = new Set<string>();
  const collections = new Set<string>();

  if (body.productId !== undefined && body.productId !== null && String(body.productId).trim()) {
    productIds.add(String(body.productId).trim());
  }
  if (Array.isArray(body.productIds)) {
    for (const id of body.productIds) {
      if (id !== undefined && id !== null && String(id).trim()) {
        productIds.add(String(id).trim());
      }
    }
  }
  if (typeof body.collection === 'string' && body.collection.trim()) {
    collections.add(body.collection.trim());
  }
  if (Array.isArray(body.collections)) {
    for (const col of body.collections) {
      if (typeof col === 'string' && col.trim()) {
        collections.add(col.trim());
      }
    }
  }

  // Supabase Database Webhook compatibility ({ type, table, record, old_record })
  for (const recKey of ['record', 'old_record'] as const) {
    const rec = body[recKey];
    if (rec && typeof rec === 'object') {
      const r = rec as Record<string, unknown>;
      if (body.table === 'product_variants' && r.product_id) {
        productIds.add(String(r.product_id));
      } else if (r.id) {
        productIds.add(String(r.id));
      }
      if (typeof r.collection === 'string' && r.collection.trim()) {
        collections.add(r.collection.trim());
      }
    }
  }

  for (const id of productIds) {
    expireTag(productCacheTag(id));
    expirePath(`/product/${id}`, 'page');
  }

  for (const col of collections) {
    expireTag(collectionCacheTag(col));
    const slug = toCollectionSlug(col);
    if (slug) {
      expirePath(`/collections/${slug}`, 'page');
    }
  }

  // 3. Purge full-page cached routes & cached shared mobile APIs on Vercel
  expirePath('/collections/[slug]', 'page');
  expirePath('/product/[id]', 'page');
  expirePath('/match-inspiration', 'page');
  expirePath('/sitemap.xml');
  expirePath('/api/v1/products');
  expirePath('/api/v1/products/collections');
  expirePath('/api/v1/categories');
  expirePath('/api/v1/project-types');
  expirePath('/api/v1/customer-types');
  expirePath('/api/v1/check-update');
  expirePath('/', 'layout');

  // 4. Purge Cloudflare Edge Cache automatically
  const cloudflare = await purgeCloudflareZoneCache();

  return NextResponse.json(
    {
      success: true,
      revalidated: true,
      revalidatedAt: new Date().toISOString(),
      reason: typeof body.reason === 'string' ? body.reason : 'manual-or-admin-update',
      purgedTags: Array.from(purgedTags),
      purgedPaths: Array.from(purgedPaths),
      cloudflare,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
      },
    }
  );
}
