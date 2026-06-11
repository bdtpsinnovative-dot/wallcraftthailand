// app/api/v1/auth/login/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. ตรวจสอบข้อมูลเบื้องต้น (Server-side Validation)
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 2. ใช้ Service Role Key หรือ Anon Key ที่เก็บไว้ใน .env ของ Server เท่านั้น
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ใช้ตัวนี้จะปลอดภัยกว่าเพราะอยู่ที่ Server เท่านั้น
    );

    // 3. ทำการล็อกอินผ่าน Supabase SDK ที่ฝั่ง Server
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // 4. ส่ง Session กลับไปให้ Flutter
    return NextResponse.json({
      message: 'Login successful',
      session: data.session,
      user: data.user
    });

  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}