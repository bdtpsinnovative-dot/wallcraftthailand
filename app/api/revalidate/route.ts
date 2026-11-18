import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  CACHE_TAGS,
  collectionCacheTag,
  productCacheTag,
} from '@/app/lib/public-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CloudflarePurgeStatus {
  purged: boolean;
  skipped?: boolean;
  error?: string;
}

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

async function purgeCloudflareEdgeCache(): Promise<CloudflarePurgeStatus> {
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

  // 1. Purge all core product/catalog tags immediately on Vercel
  expireTag(CACHE_TAGS.PRODUCTS);
  expireTag(CACHE_TAGS.COLLECTIONS);
  expireTag(CACHE_TAGS.INSPIRATION);
  expireTag(CACHE_TAGS.SITEMAP);

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

  // 3. Purge full-page cached routes across the entire public site on Vercel
  expirePath('/collections/[slug]', 'page');
  expirePath('/product/[id]', 'page');
  expirePath('/match-inspiration', 'page');
  expirePath('/sitemap.xml');
  expirePath('/', 'layout');

  // 4. Purge Cloudflare Edge Cache automatically (if CLOUDFLARE_ZONE_ID & CLOUDFLARE_API_TOKEN are set)
  const cloudflare = await purgeCloudflareEdgeCache();

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
