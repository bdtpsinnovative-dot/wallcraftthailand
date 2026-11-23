// app/lib/product-views.ts
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'wallcraft';
const R2_VIEWS_KEY = 'analytics/product_views.json';
const R2_LOGS_KEY = 'analytics/engagement_logs.json';
const MAX_LOGS_RETAINED = 20000;

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

export interface EngagementLogEvent {
  id: string;
  productId: number | string;
  productName: string;
  collection: string;
  variantPattern?: string;
  viewerType: 'sales' | 'customer';
  userId?: string;
  userEmail?: string;
  userName?: string;
  durationSeconds: number;
  isIdle: boolean;
  device?: string;
  timestamp: string; // ISO
}

// In-memory cache for ultra-fast response
let inMemoryViews: Record<string, number> | null = null;
let inMemoryLogs: EngagementLogEvent[] | null = null;
let lastFetchTime = 0;
let lastLogsFetchTime = 0;
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
        Key: R2_VIEWS_KEY,
      })
    );
    const body = await res.Body?.transformToString();
    if (body) {
      inMemoryViews = JSON.parse(body);
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

export async function getEngagementLogs(): Promise<EngagementLogEvent[]> {
  const now = Date.now();
  if (inMemoryLogs && now - lastLogsFetchTime < CACHE_TTL_MS) {
    return inMemoryLogs;
  }

  const client = getR2Client();
  if (!client) {
    return inMemoryLogs || [];
  }

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: R2_LOGS_KEY,
      })
    );
    const body = await res.Body?.transformToString();
    if (body) {
      inMemoryLogs = JSON.parse(body);
      lastLogsFetchTime = now;
      return inMemoryLogs || [];
    }
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      if (!inMemoryLogs) inMemoryLogs = [];
      lastLogsFetchTime = now;
      return inMemoryLogs;
    }
    console.error('Failed to read engagement logs from R2:', err);
  }

  return inMemoryLogs || [];
}

export async function flushViewsToR2(): Promise<void> {
  if (!isDirty) return;
  const client = getR2Client();
  if (!client) return;

  try {
    isDirty = false;

    // 1. Persist views counter map
    if (inMemoryViews) {
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: R2_VIEWS_KEY,
          Body: JSON.stringify(inMemoryViews),
          ContentType: 'application/json',
        })
      );
    }

    // 2. Persist engagement logs
    if (inMemoryLogs) {
      // Keep within retention limit
      if (inMemoryLogs.length > MAX_LOGS_RETAINED) {
        inMemoryLogs = inMemoryLogs.slice(0, MAX_LOGS_RETAINED);
      }
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: R2_LOGS_KEY,
          Body: JSON.stringify(inMemoryLogs),
          ContentType: 'application/json',
        })
      );
    }
  } catch (err) {
    console.error('Failed to persist analytics to R2:', err);
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

export async function recordEngagementEvent(
  event: Omit<EngagementLogEvent, 'id' | 'timestamp'>
): Promise<{ views: number; eventId: string }> {
  const eventId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const fullEvent: EngagementLogEvent = {
    ...event,
    id: eventId,
    timestamp: new Date().toISOString(),
  };

  // Ensure logs and views are initialized
  if (!inMemoryLogs) await getEngagementLogs();
  if (!inMemoryViews) await getProductViewCounts();
  if (!inMemoryLogs) inMemoryLogs = [];
  if (!inMemoryViews) inMemoryViews = {};

  // Increment total views
  const key = String(event.productId);
  const newViews = (inMemoryViews[key] || 0) + 1;
  inMemoryViews[key] = newViews;

  // Add to beginning of logs
  inMemoryLogs.unshift(fullEvent);
  isDirty = true;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    flushViewsToR2();
  }, 1000);

  return { views: newViews, eventId };
}

export async function resetEngagementAnalytics(): Promise<void> {
  const client = getR2Client();
  inMemoryViews = {};
  inMemoryLogs = [];
  isDirty = false;

  if (!client) return;

  await Promise.all([
    client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: R2_VIEWS_KEY,
      Body: JSON.stringify({}),
      ContentType: 'application/json',
    })).catch(() => {}),
    client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: R2_LOGS_KEY,
      Body: JSON.stringify([]),
      ContentType: 'application/json',
    })).catch(() => {}),
  ]);
}
