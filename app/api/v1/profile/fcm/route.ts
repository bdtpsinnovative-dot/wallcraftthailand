import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
  try {
    // 1. รับ Authorization Header จาก Flutter
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });

    // 2. สร้าง Client ด้วย Anon Key ก่อน เพื่อตรวจสอบตัวตนผู้ใช้
    const supabaseUserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ตรวจสอบ User จาก Token ที่ Flutter ส่งมา
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser(token);
    if (userError || !user) {
        console.error("Auth Error:", userError);
        return NextResponse.json({ error: 'Unauthorized: Invalid user' }, { status: 401 });
    }

    // 3. รับ FCM Token จาก Flutter
    const body = await req.json();
    const { fcm_token, device_type = 'android' } = body;

    if (!fcm_token) {
        return NextResponse.json({ error: 'fcm_token is required' }, { status: 400 });
    }

    // 4. สร้าง Client ด้วย Service Role Key (กุญแจแอดมิน) เพื่อเรียก RPC
    // สำคัญ: ต้องใช้ Service Role Key เพราะ RPC บางตัวอาจติด RLS Policy
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // ต้องเช็คใน .env ว่ามีคีย์นี้!
    );

    // 5. เรียก RPC โดยส่ง user.id ไปให้ Database ด้วย
    const { error: rpcError } = await supabaseAdmin.rpc('update_user_fcm_token_admin', {
        user_id_param: user.id,
        new_token: fcm_token,
        device_type_param: device_type
    });

    if (rpcError) {
        console.error("Supabase RPC Error:", rpcError);
        throw rpcError;
    }

    return NextResponse.json({ success: true, message: 'FCM Token updated successfully' });

  } catch (err: any) {
    console.error("API Error 500:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}