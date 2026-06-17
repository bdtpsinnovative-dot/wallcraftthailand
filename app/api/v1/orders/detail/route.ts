// app/api/v1/orders/detail/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'ต้องระบุ order_id' }, { status: 400 });
    }

    // 🌟 ดึงข้อมูลออเดอร์แบบทะลวงลึกทุกตาราง (เพิ่มข้อมูลที่แอดมินเพิ่งแก้มาให้ครบ!)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, customer_name, phone,
        profiles(full_name),
        companies(name),
        order_items(
          note, images,
          product_categories(name),
          order_item_projects(
            project_name, 
            area_sqm,
            project_note,       /* 🌟 คอมเมนต์แอดมิน */
            queue_level,        /* 🌟 คิวงาน */
            project_year,       /* 🌟 ปี พ.ศ. */
            project_types(name) /* 🌟 ประเภทโครงการ */
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (err: any) {
    console.error('Order Detail API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}