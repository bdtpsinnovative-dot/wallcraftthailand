import { NextResponse } from 'next/server';
import {
  CLOUDFLARE_PUBLIC_API_HEADERS,
  getCachedMobileCollections,
} from '@/app/lib/public-cache';

export const revalidate = 31536000;

export async function GET() {
  try {
    const collections = await getCachedMobileCollections();

    return NextResponse.json(
      { success: true, data: collections },
      { headers: CLOUDFLARE_PUBLIC_API_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
