// app/api/v1/send-notification/route.ts
import { messaging } from '../../../lib/firebase-admin';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. ตรวจสอบ Authorization (Basic Security)
    // TODO: แนะนำให้เพิ่มการตรวจสอบ API Key หรือ Secret Token ตรงนี้ในอนาคต
    const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.NOTIFICATION_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { user_id, tokens, title, body, data } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'No tokens found' }, { status: 200 });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      tokens: tokens,
      android: {
        priority: 'high' as const,
        notification: { sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // ลบ Token ที่ตายแล้วออกจาก Database
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      console.log(`⚠️ พบ Token ส่งไม่ผ่าน ${response.failureCount} ตัว กำลังลบออกจากระบบ...`, failedTokens);
      
      // เรียกใช้ Supabase Service Role เพื่อข้าม RLS
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // เรียก RPC เพื่อลบ Token ขยะออกจาก profiles 
      // (ต้องไปสร้าง RPC ชื่อ remove_invalid_fcm_tokens ใน Supabase ด้วย)
      const { error: dbError } = await supabaseAdmin.rpc('remove_invalid_fcm_tokens', {
        invalid_tokens: failedTokens
      });

      if (dbError) {
        console.error("❌ ลบ Dead Tokens ไม่สำเร็จ:", dbError);
      } else {
        console.log("✅ ลบ Dead Tokens เรียบร้อยแล้ว");
      }
    }

    return NextResponse.json({ success: true, sentCount: response.successCount });

  } catch (error: any) {
    console.error("❌ Notification Route Error:", error);
    // ป้องกันข้อมูลภายในรั่วไหลด้วยการส่งกลับแค่คำว่า Internal Server Error
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}