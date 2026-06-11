import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 1. ตรวจสอบว่าส่งข้อมูลมาครบไหม
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      );
    }

    // 2. สร้าง Client แบบ Admin (Service Role)
    // ใช้ Service Role Key เพื่อให้มีสิทธิ์จัดการ User ได้เต็มที่
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 3. สั่งสมัครสมาชิก (Sign Up)
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      // options: { // ถ้าอยากเก็บชื่อ หรือข้อมูลอื่นเพิ่ม ใส่ตรงนี้ได้ครับ
      //   data: {
      //     full_name: body.fullName,
      //     role: 'user' 
      //   }
      // }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4. ส่งผลลัพธ์กลับ
    // หมายเหตุ: ถ้าใน Supabase เปิด Confirm Email ไว้ 
    // data.session จะเป็น null จนกว่า user จะกดยืนยันอีเมล
    return NextResponse.json({
      message: 'Registration successful',
      user: data.user,
      session: data.session, 
    });

  } catch (err) {
    console.error('Register Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}