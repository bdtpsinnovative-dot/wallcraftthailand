import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // ดึงค่า User-Agent ที่ส่งมา
  const userAgent = request.headers.get('user-agent') || ''

  // 🚫 รายชื่อบอทที่นายต้องการบล็อก (ทำเป็นตัวเล็กให้หมดเพื่อจับง่ายๆ)
  const blockedBots = [
    'claude-searchbot',
    'ahrefsbot',
    'semrushbot',
    'semrush',
    'mj12bot',
    'dotbot',
    'petalbot',
    'rogerbot',
    'oai-searchbot',
    'chatgpt-user',
    'applebot'
  ]

  // เช็คว่า User-Agent มีคำที่ตรงกับชื่อบอทด้านบนไหม
  const isBlocked = blockedBots.some(bot => userAgent.toLowerCase().includes(bot))

  if (isBlocked) {
    // ถ้าใช่ เตะทิ้งทันที! คืนค่า 403 Forbidden สั้นๆ ไม่เปลืองแบนด์วิธ
    return new NextResponse('Forbidden: Access Denied for Bots', { status: 403 })
  }

  // ถ้าเป็นคนปกติ (หรือ Googlebot ที่ไม่ได้อยู่ในลิสต์) ก็ปล่อยผ่านปกติ
  return NextResponse.next()
}

// ตั้งค่าให้ดักจับทุก Path ในเว็บ
export const config = {
  matcher: '/:path*',
}