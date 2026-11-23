// app/lib/product-views.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'wallcraft';
const R2_KEY = 'analytics/product_views.json';

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// In-memory cache for ultra-fast response
let inMemoryViews: Record<string, number> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds
let saveTimeout: NodeJS.Timeout | null = null;
let isDirty = false;

export async function getProductViewCounts(): Promise<Record<string, number>> {
  const now = Date.now();
  if (inMemoryViews && now - lastFetchTime < CACHE_TTL_MS) {
    return inMemoryViews;
  }

  const client = getR2Client();
  if (!client) {
    return inMemoryViews || {};
  }

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: R2_KEY,
      })
    );
    const body = await res.Body?.transformToString();
    if (body) {
      const parsed = JSON.parse(body);
      inMemoryViews = parsed;
      lastFetchTime = now;
      return inMemoryViews || {};
    }
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      if (!inMemoryViews) inMemoryViews = {};
      lastFetchTime = now;
      return inMemoryViews;
    }
    console.error('Failed to read product views from R2:', err);
  }

  return inMemoryViews || {};
}

export async function flushViewsToR2(): Promise<void> {
  if (!isDirty || !inMemoryViews) return;
  const client = getR2Client();
  if (!client) return;

  try {
    isDirty = false;
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: R2_KEY,
        Body: JSON.stringify(inMemoryViews),
        ContentType: 'application/json',
      })
    );
  } catch (err) {
    console.error('Failed to persist product views to R2:', err);
    isDirty = true;
  }
}

export async function incrementProductView(productId: string | number): Promise<number> {
  const key = String(productId);
  if (!inMemoryViews) {
    await getProductViewCounts();
  }
  if (!inMemoryViews) {
    inMemoryViews = {};
  }

  const newCount = (inMemoryViews[key] || 0) + 1;
  inMemoryViews[key] = newCount;
  isDirty = true;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    flushViewsToR2();
  }, 1000);

  return newCount;
}
