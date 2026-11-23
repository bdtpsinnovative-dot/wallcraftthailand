// app/api/v1/products/view/route.ts
import { NextResponse } from 'next/server';
import {
  incrementProductView,
  recordEngagementEvent,
  flushViewsToR2,
} from '@/app/lib/product-views';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const productId = body.productId ?? body.id;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Missing productId parameter' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const durationSeconds = typeof body.durationSeconds === 'number'
      ? Math.max(0, Math.min(body.durationSeconds, 3600))
      : 5; // default 5 seconds if not specified

    const isIdle = Boolean(body.isIdle || durationSeconds > 180);

    const result = await recordEngagementEvent({
      productId,
      productName: body.productName || 'ไม่ระบุชื่อ',
      collection: body.collection || 'ทั่วไป',
      variantPattern: body.variantPattern || '',
      viewerType: body.viewerType === 'sales' ? 'sales' : 'customer',
      userId: body.userId || '',
      userEmail: body.userEmail || '',
      userName: body.userName || (body.viewerType === 'sales' ? 'พนักงานขาย' : 'ลูกค้าบนเว็บไซต์'),
      durationSeconds,
      isIdle,
      device: body.device || 'unknown',
    });

    // Asynchronously flush to R2
    flushViewsToR2().catch((err) => console.error('Flush error:', err));

    return NextResponse.json(
      {
        success: true,
        productId,
        views: result.views,
        eventId: result.eventId,
      },
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (error: any) {
    console.error('Increment Product View Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
