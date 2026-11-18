import { NextResponse } from 'next/server';
import {
  CLOUDFLARE_PUBLIC_API_HEADERS,
  DEFAULT_APP_UPDATE_DATA,
  getCachedAppUpdateSettings,
} from '@/app/lib/public-cache';

export const revalidate = 31536000;

export async function GET() {
  try {
    const updateData = await getCachedAppUpdateSettings();

    return NextResponse.json(updateData, {
      headers: CLOUDFLARE_PUBLIC_API_HEADERS,
    });
  } catch (error) {
    console.error('[check-update] Unexpected error:', error);
    return NextResponse.json(DEFAULT_APP_UPDATE_DATA, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
