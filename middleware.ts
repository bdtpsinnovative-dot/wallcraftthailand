import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CLOUDFLARE_PUBLIC_CACHE_HEADER = 'public, max-age=31536000, stale-while-revalidate=86400'

const NON_CACHEABLE_PATH_PREFIXES = [
  '/api/',
  '/login',
  '/register',
  '/profile',
  '/search',
]

function corsHeaders(request: NextRequest): Headers {
  const origin = request.headers.get('origin') ?? ''
  const isFlutterWebDevServer = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  const headers = new Headers()

  if (!isFlutterWebDevServer) return headers

  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Vary', 'Origin')
  return headers
}

function applyCloudflareCacheHeader(request: NextRequest, response: NextResponse): NextResponse {
  const pathname = request.nextUrl.pathname
  const isGetOrHead = request.method === 'GET' || request.method === 'HEAD'
  const isRscOrPrefetch =
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1' ||
    Boolean(request.headers.get('next-router-state-tree')) ||
    request.nextUrl.searchParams.has('_rsc')

  const isNonCacheablePath = NON_CACHEABLE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )

  if (!isGetOrHead || isNonCacheablePath || isRscOrPrefetch) {
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
  } else {
    response.headers.set('Cloudflare-CDN-Cache-Control', CLOUDFLARE_PUBLIC_CACHE_HEADER)
  }

  return response
}

export function middleware(request: NextRequest) {
  // Flutter Web รันจาก localhost คนละ origin กับ Next.js ในระหว่างพัฒนา
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const headers = corsHeaders(request)

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers })
    }

    const res = NextResponse.next({ headers })
    res.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    return res
  }

  // 🟢 1. เปิดทางด่วนให้ไฟล์ระบบที่จำเป็น! ปล่อยผ่านทันทีไม่ต้องเช็คบอท
  // (เพื่อให้บอทเข้ามาอ่านกฎ robots.txt ของเราได้ และไม่ให้หน้าเว็บแจ้งเตือน error ไฟล์ภาพ)
  const allowedPaths = ['/robots.txt', '/sitemap.xml', '/favicon.ico', '/favicon.png']
  if (allowedPaths.some(path => request.nextUrl.pathname === path)) {
    return applyCloudflareCacheHeader(request, NextResponse.next())
  }

  // 🟡 2. ดึงค่า User-Agent ที่ส่งมา
  const userAgent = request.headers.get('user-agent') || ''

  // 🚫 3. รายชื่อบอทที่นายต้องการบล็อก (ตัวเล็กทั้งหมด)
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

  // 🔴 4. เช็คว่า User-Agent มีคำที่ตรงกับชื่อบอทด้านบนไหม
  const isBlocked = blockedBots.some(bot => userAgent.toLowerCase().includes(bot))

  if (isBlocked) {
    // ถ้าเป็นบอทในลิสต์ เตะทิ้งทันที! (403 Forbidden)
    return new NextResponse('Forbidden: Access Denied for Bots', { status: 403 })
  }

  // 🟢 5. ถ้าเป็นคนปกติ (หรือ Googlebot ที่ไม่ได้อยู่ในลิสต์) ปล่อยผ่านปกติ พร้อมติด Header แคช Cloudflare 1 ปี
  return applyCloudflareCacheHeader(request, NextResponse.next())
}

// ตั้งค่าให้ดักจับทุก Path ในเว็บ ยกเว้นพวกไฟล์ static ของ Next.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!_next/static|_next/image).*)',
  ],
}
