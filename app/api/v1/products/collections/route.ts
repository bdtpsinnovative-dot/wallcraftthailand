import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('get_unique_collections');

    if (error) throw error;

    // แกะเฉพาะชื่อ collection ออกมาเป็น Array ของ String
    const collections = data.map((item: any) => item.collection_name);

    return NextResponse.json({ success: true, data: collections });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}