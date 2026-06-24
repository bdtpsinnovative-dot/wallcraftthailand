// src/app/api/v1/tps-tracking/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. GET: ดึงข้อมูลพัสดุ
// ==========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search'); 

    let query = supabase
      .from('tps_records')
      .select(`
        id,
        ref_code,
        jk_code,
        ctn,
        tracking_number,
        status,
        updated_at,
        tps_batches (
          batch_code,
          batch_date
        )
      `)
      .order('updated_at', { ascending: false }); 

    if (search) {
      query = query.or(`ref_code.ilike.%${search}%,jk_code.ilike.%${search}%`);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = data.map((item: any) => ({
      id: item.id,
      refCode: item.ref_code,
      jkCode: item.jk_code,
      ctn: item.ctn,
      trackingNumber: item.tracking_number,
      status: item.status,
      updatedAt: item.updated_at,
      batchCode: item.tps_batches?.batch_code || "-",
      batchDate: item.tps_batches?.batch_date || "-"
    }));

    return NextResponse.json({ 
      success: true, 
      count: formattedData.length,
      data: formattedData 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Fetch Tracking API Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลพัสดุ" 
    }, { status: 500 });
  }
}

// ==========================================
// 2. POST: เพิ่มรอบส่งพัสดุใหม่ (โหมดแอดมิน)
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batchDate, batchCode, records } = body;

    if (!batchDate || !batchCode || !records || records.length === 0) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    let { data: batchData, error: batchError } = await supabase
      .from('tps_batches')
      .select('id')
      .eq('batch_code', batchCode)
      .eq('batch_date', batchDate)
      .single();

    let batchId;

    if (!batchData) {
      const { data: newBatch, error: insertBatchError } = await supabase
        .from('tps_batches')
        .insert([{ batch_code: batchCode, batch_date: batchDate }])
        .select('id')
        .single();

      if (insertBatchError) throw insertBatchError;
      batchId = newBatch.id;
    } else {
      batchId = batchData.id; 
    }

    const insertRecords = records.map((rec: any) => ({
      batch_id: batchId,
      ref_code: rec.refCode,
      jk_code: rec.jkCode,
      ctn: parseInt(rec.ctn) || 1,
      tracking_number: rec.tracking === '-' || !rec.tracking ? null : rec.tracking, 
      status: 'in_transit'
    }));

    const { error: recordsError } = await supabase
      .from('tps_records')
      .insert(insertRecords);

    if (recordsError) throw recordsError;

    return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ' }, { status: 201 });

  } catch (error: any) {
    console.error("POST Tracking API Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" 
    }, { status: 500 });
  }
}

// ==========================================
// 🌟 3. PATCH: อัปเดตสถานะพัสดุ (รับแบบ Array เพื่ออัปเดตหลายชิ้นพร้อมกัน)
// ==========================================
// src/app/api/v1/tps-tracking/route.ts

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    // 🌟 1. รับ token เพิ่มเข้ามาจาก Flutter
    const { token, ids, status } = body; 

    // 🌟 2. ตรวจสอบว่ามี Token ไหม และข้อมูลครบไหม
    if (!token) return NextResponse.json({ error: 'Unauthorized: ไม่พบ Token' }, { status: 401 });
    if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 🌟 3. ตรวจสอบ Token ว่าถูกต้องไหม
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or Expired Token' }, { status: 401 });
    }

    // 🌟 4. ดึงโปรไฟล์มาเช็คว่าเป็น Admin จริงหรือไม่!
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: คุณไม่มีสิทธิ์จัดการพัสดุ (Admin เท่านั้น)' }, { status: 403 });
    }

    // ==========================================
    // ถ้าผ่านด่านข้างบนมาได้ แสดงว่าเป็น Admin ตัวจริง! ลุยอัปเดตเลย
    // ==========================================
    const { data, error } = await supabase
      .from('tps_records')
      .update({ status: status })
      .in('id', ids) 
      .select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `อัปเดตสถานะสำเร็จ ${data.length} รายการ`, 
      data 
    }, { status: 200 });

  } catch (error: any) {
    console.error("PATCH Tracking API Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ" 
    }, { status: 500 });
  }
}