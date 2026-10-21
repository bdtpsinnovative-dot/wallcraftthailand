// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const CENTRAL_SUPABASE_URL =
  process.env.CENTRAL_SUPABASE_URL || 'https://gshppxgvdrmbfcxsxeph.supabase.co';
const CENTRAL_SUPABASE_ANON_KEY =
  process.env.CENTRAL_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ติดต่อ' },
        { status: 400 }
      );
    }
    if (!phone?.trim() && !email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรหรืออีเมลเพื่อการติดต่อกลับ' },
        { status: 400 }
      );
    }

    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';

    // Insert directly into the central database for Admin & HR portal
    const supabase = createClient(CENTRAL_SUPABASE_URL, CENTRAL_SUPABASE_ANON_KEY);
    const { error: insertError } = await supabase
      .from('contact_inquiries')
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        message: message?.trim() || '',
        source: 'wallcraft',
        status: 'new',
      });

    if (insertError) {
      console.error('Failed to insert inquiry to Central DB:', insertError);
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'ส่งข้อความเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error('Error in /api/contact:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
