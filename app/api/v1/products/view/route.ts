// app/api/v1/products/view/route.ts
import { NextResponse } from 'next/server';
import { incrementProductView, flushViewsToR2 } from '@/app/lib/product-views';

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

    const views = await incrementProductView(productId);
    // Asynchronously flush to R2
    flushViewsToR2().catch((err) => console.error('Flush error:', err));

    return NextResponse.json(
      {
        success: true,
        productId,
        views,
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
