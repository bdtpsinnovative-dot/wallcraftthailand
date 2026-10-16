// app/api/v1/auth/change-password/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequestUser, getSupabaseAdmin } from '@/app/lib/auth-helper';

function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('origin') ?? '';
  const isFlutterWebDevServer = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  const headers = new Headers();

  if (!isFlutterWebDevServer) {
    return headers;
  }

  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Vary', 'Origin');
  return headers;
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);

  try {
    const body = await request.json();
    const { token, current_password, new_password } = body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' },
        { status: 400, headers }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400, headers }
      );
    }

    if (current_password === new_password) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน' },
        { status: 400, headers }
      );
    }

    // 2. ยืนยันตัวตนผู้ใช้จาก Token
    const { user, error: authError } = await authenticateRequestUser(request, token);
    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง' },
        { status: 401, headers }
      );
    }

    // 3. ตรวจสอบว่ารหัสผ่านปัจจุบัน (current_password) ถูกต้องจริงหรือไม่ โดยลอง signInWithPassword
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    const { error: verifyError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (verifyError) {
      return NextResponse.json(
        { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' },
        { status: 400, headers }
      );
    }

    // 4. เมื่อรหัสผ่านปัจจุบันถูกต้อง ให้ใช้ Admin SDK อัปเดตรหัสผ่านใหม่
    const admin = getSupabaseAdmin();
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) {
      console.error('Password Update Error:', updateError);
      return NextResponse.json(
        { error: `ไม่สามารถเปลี่ยนรหัสผ่านได้: ${updateError.message}` },
        { status: 400, headers }
      );
    }

    return NextResponse.json(
      { message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' },
      { headers }
    );
  } catch (err: any) {
    console.error('Change Password Unexpected Error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง' },
      { status: 500, headers }
    );
  }
}
