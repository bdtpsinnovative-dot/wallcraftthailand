import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ป้องกัน Next.js จำแคช
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. ดึงข้อมูลตารางหลัก + รูปลิงก์
    const { data, error } = await supabase
      .from('stock_balance')
      .select(`
        id, series, item_name, color_name, material, height_mm, width_mm, thickness_mm, qty, last_updated,
        linked_item:product_variants!linked_variant_id(
          sku, variant_image,
          products ( image_url )
        )
      `)
      .order('last_updated', { ascending: false });

    if (error) throw error;

    // 🌟 2. ดึงยอดที่กำลัง "รออนุมัติ (pending)" จาก stock_out มาคำนวณ
    const { data: pendingData } = await supabase
      .from('stock_out')
      .select('product_id, qty')
      .eq('status', 'pending');

    const pendingMap: Record<string, number> = {};
    if (pendingData) {
      pendingData.forEach((p: any) => {
        pendingMap[p.product_id] = (pendingMap[p.product_id] || 0) + p.qty;
      });
    }

    // 3. จัดระเบียบข้อมูลและยัด pending_qty ลงไป
    const formattedData = data.map((item: any) => {
      const imgUrl = item.linked_item?.variant_image || item.linked_item?.products?.image_url || null;
      
      return {
        id: item.id,
        series: item.series ?? '-',
        item_name: item.item_name ?? '-',
        color: item.color_name ?? '-',
        material: item.material ?? '-',
        height_mm: item.height_mm ?? 0,
        width_mm: item.width_mm ?? 0,
        thickness_mm: item.thickness_mm ?? 0,
        qty: item.qty ?? 0,
        pending_qty: pendingMap[item.id] || 0, // 🌟 แนบยอด Pending กลับไปให้ Flutter
        catalog_image: imgUrl,
        catalog_sku: item.linked_item?.sku ?? '-'
      };
    });

    return NextResponse.json({ success: true, data: formattedData });

  } catch (error: any) {
    console.error('Stock API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}