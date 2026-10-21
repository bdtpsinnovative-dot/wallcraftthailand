// app/api/v1/pi-records/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Database service configuration missing' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const supplier = searchParams.get('supplier')?.trim();
    const brand = searchParams.get('brand')?.trim();
    const saleName = searchParams.get('sale_name')?.trim();
    const etd = searchParams.get('etd')?.trim();
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    let query = supabase
      .from('pi_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (supplier && supplier !== 'All') {
      query = query.ilike('supplier', `%${supplier}%`);
    }

    if (brand && brand !== 'All') {
      query = query.ilike('brand', `%${brand}%`);
    }

    if (saleName && saleName !== 'All') {
      query = query.ilike('sale_name', `%${saleName}%`);
    }

    if (etd && etd !== 'All') {
      query = query.ilike('etd', `%${etd}%`);
    }

    if (search) {
      query = query.or(
        `pi_supplier.ilike.%${search}%,order_no.ilike.%${search}%,project_name.ilike.%${search}%,supplier.ilike.%${search}%,sale_name.ilike.%${search}%,brand.ilike.%${search}%`
      );
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pi_records from Supabase:', error);
      throw error;
    }

    const formattedData = (data || []).map((item: any) => ({
      id: item.id,
      piSupplier: item.pi_supplier || '',
      recordDate: item.record_date || '',
      supplier: item.supplier || '',
      linkFile: item.link_file || '',
      linkFileUrl: (item.link_file_url && item.link_file_url.trim()) ? item.link_file_url : (item.link_file || ''),
      amountYuan: item.amount_yuan || '',
      amountDollar: item.amount_dollar || '',
      etd: item.etd || '',
      brand: item.brand || '',
      orderNo: item.order_no || '',
      fileName: item.file_name || '',
      fileUrl: (item.file_url && item.file_url.trim()) ? item.file_url : (item.file_name || ''),
      saleName: item.sale_name || '',
      projectName: item.project_name || '',
      requestedDate: item.requested_date || '',
      paymentDate: item.payment_date || '',
      shippingMethod: item.shipping_method || '',
      deliveredDate: item.delivered_date || '',
      dateOrder: item.date_order || '',
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || '',
    }));

    // เรียงลำดับตามวันที่บันทึก (record_date) จากล่าสุดไปเก่าสุด
    function parseDate(s: string | null | undefined): number {
      if (!s || s.trim() === '-' || !s.trim()) return 0;
      const parts = s.trim().split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (y > 2500) y -= 543;
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d).getTime();
      }
      const p = Date.parse(s);
      return isNaN(p) ? 0 : p;
    }

    formattedData.sort((a: any, b: any) => {
      const timeA = parseDate(a.recordDate);
      const timeB = parseDate(b.recordDate);
      if (timeA === 0 && timeB === 0) return 0;
      if (timeA === 0) return 1;
      if (timeB === 0) return -1;
      return timeB - timeA;
    });

    return NextResponse.json(
      {
        success: true,
        count: formattedData.length,
        data: formattedData,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error: any) {
    console.error('PI Records API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
