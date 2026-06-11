// app/api/v1/send-notification/route.ts
import { messaging } from '../../../lib/firebase-admin';
import { NextResponse } from 'next/server';

// 🌟 บังคับให้เส้นนี้ทำงานแบบ Dynamic Server เสมอ ป้องกันการเอ๋อตอน npm run build ครับนาย
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. รับค่าที่ส่งมาจากส่วนอื่นๆ
    const { user_id, tokens, title, body, data } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'No tokens found' }, { status: 200 });
    }

    // 2. เตรียม Payload ที่รองรับทั้ง Android และ iOS
    const message = {
      notification: { title, body },
      data: data || {}, // ส่งพวก order_id ไปให้แอปเอาไปเปิดหน้าถูก
      tokens: tokens, // Array ของ tokens ที่ดึงมาจาก jsonb ใน profiles
      android: {
        priority: 'high' as const,
        notification: { sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    // 3. ยิงออกไปหาทุกเครื่องพร้อมกันผ่าน Firebase Admin ตัวปกติ
    const response = await messaging.sendEachForMulticast(message);

    // 4. ถ้าส่งไม่สำเร็จเพราะ Token หมดอายุ นายสามารถเอาตัวแปร failedTokens ไปกรองออกจาก Supabase ได้เลยครับ
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      // 💡 โน้ตไว้เผื่อนายมาเขียนต่อ: 
      // เอา failedTokens ไปอัปเดตลบออกจากอาเรย์ในฟิลด์ jsonb ของ Supabase ได้เลยครับ
      console.log(`⚠️ มี Token ส่งไม่ผ่านจำนวน ${response.failureCount} ตัว`, failedTokens);
    }

    return NextResponse.json({ success: true, sentCount: response.successCount });

  } catch (error: any) {
    console.error("❌ Notification Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}