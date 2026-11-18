import { NextResponse } from 'next/server';
import {
  CLOUDFLARE_PUBLIC_API_HEADERS,
  getCachedProjectTypes,
} from '@/app/lib/public-cache';

export const revalidate = 31536000;

export async function GET() {
  try {
    const data = await getCachedProjectTypes();

    return NextResponse.json(
      { data },
      { headers: CLOUDFLARE_PUBLIC_API_HEADERS }
    );
  } catch (error: any) {
    console.error('API Error (v1/project-types):', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
