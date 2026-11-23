// app/api/v1/products/route.ts
import { NextResponse } from 'next/server';
import {
  CLOUDFLARE_MOBILE_PRODUCTS_HEADERS,
  getCachedMobileProducts,
} from '@/app/lib/public-cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    // 🌟 รับค่า page และ limit จากแอป Flutter
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const limit = parseInt(searchParams.get('limit') || '50', 10) || 50;

    // 🌟 รับค่าหมวดหมู่ (แบบเดี่ยว และ แบบกลุ่ม)
    const collection = searchParams.get('collection') || '';
    const collectionsGroup = searchParams.get('collections') || '';

    const formattedData = await getCachedMobileProducts({
      keyword,
      page,
      limit,
      collection,
      collectionsGroup,
    });

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
      },
      {
        status: 200,
        headers: CLOUDFLARE_MOBILE_PRODUCTS_HEADERS,
      }
    );
  } catch (error: any) {
    console.error('Fetch Products Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
