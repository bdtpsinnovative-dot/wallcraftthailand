import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import {
  CACHE_TAGS,
  CLOUDFLARE_PUBLIC_API_HEADERS,
  getCachedCustomerTypes,
  purgeCloudflareZoneCache,
} from '@/app/lib/public-cache';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อประเภทลูกค้า' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('customer_types')
      .insert({ name: name })
      .select()
      .single();

    if (error) throw error;

    // Auto-purge customer-types cache on both Vercel and Cloudflare
    revalidateTag(CACHE_TAGS.MASTER_DATA, { expire: 0 });
    revalidatePath('/api/v1/customer-types');
    await purgeCloudflareZoneCache();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await getCachedCustomerTypes();

    return NextResponse.json(data, {
      headers: CLOUDFLARE_PUBLIC_API_HEADERS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
