// app/api/v1/poolprojects/filters/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getCachedPoolFilters } from '@/app/lib/public-cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'กรุณาล็อกอินก่อนเข้าใช้งาน' }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' }, { status: 401 });
    }

    const filters = await getCachedPoolFilters();

    return NextResponse.json(filters, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
