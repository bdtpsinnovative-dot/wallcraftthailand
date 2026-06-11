// app/api/v1/chat/route.ts
import { NextResponse } from 'next/server';
import { AIService } from '../../../lib/services/aiService'; // เรียกใช้คนทำงานจากไฟล์เมื่อกี้

// ตั้งค่า CORS (เพื่อให้ Browser/App ยิงเข้ามาได้)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { message, userId } = await req.json();

    // เรียกให้ Service ทำงาน
    const reply = await AIService.processUserChat(message, userId);

    // ส่งคำตอบกลับ + บัตรผ่าน CORS
    return NextResponse.json(
      { reply },
      { headers: corsHeaders } 
    );

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}