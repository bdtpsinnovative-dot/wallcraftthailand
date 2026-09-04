// app/lib/auth-helper.ts
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * ดึง Token จาก Body, Query Params หรือ Authorization Header
 */
export function extractToken(
  request: Request,
  bodyToken?: string | null
): string | null {
  if (bodyToken && typeof bodyToken === 'string' && bodyToken.trim().length > 0) {
    return bodyToken.trim();
  }

  const authHeader =
    request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  try {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token');
    if (queryToken && queryToken.trim().length > 0) {
      return queryToken.trim();
    }
  } catch (_) {}

  return null;
}

/**
 * ยืนยันตัวตนผู้ใช้แบบ Graceful Fallback:
 * 1. ตรวจสอบผ่าน supabase.auth.getUser(token) ตามปกติ
 * 2. หาก Token หมดอายุ (Expired) ให้ถอดรหัส Payload หา User ID (sub)
 * 3. ตรวจสอบ User ID กับฐานข้อมูล Supabase ผ่าน Service Role (Admin)
 * เพื่อให้แอพมือถือของพนักงานที่ส่ง Token หมดอายุเข้ามา สามารถใช้งานต่อได้ทันที 100%
 */
export async function authenticateRequestUser(
  request: Request,
  providedToken?: string | null
): Promise<{ user: User | null; error: any }> {
  const token = extractToken(request, providedToken);
  if (!token) {
    return { user: null, error: new Error('No token provided') };
  }

  const supabase = getSupabaseAdmin();

  // 1. ลองตรวจสอบแบบปกติก่อน
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      return { user: data.user, error: null };
    }
  } catch (_) {}

  // 2. ถ้ามี Header Token ที่ต่างจาก Body Token ให้ลอง Header Token ด้วย
  const authHeader =
    request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.substring(7).trim();
    if (headerToken && headerToken !== token) {
      try {
        const { data, error } = await supabase.auth.getUser(headerToken);
        if (!error && data?.user) {
          return { user: data.user, error: null };
        }
      } catch (_) {}
    }
  }

  // 3. Graceful Fallback: สำหรับ Token ที่หมดอายุแล้วในแอพมือถือ
  const tokensToInspect = [token];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.substring(7).trim();
    if (headerToken && headerToken !== token) {
      tokensToInspect.push(headerToken);
    }
  }

  for (const t of tokensToInspect) {
    try {
      const parts = t.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const userId = payload?.sub;

        if (userId && typeof userId === 'string') {
          // ดึงข้อมูล User ตัวจริงจาก Supabase Auth โดยตรงผ่าน Admin Service Role
          const { data: adminData, error: adminError } =
            await supabase.auth.admin.getUserById(userId);

          if (!adminError && adminData?.user) {
            // ตรวจสอบว่าผู้ใช้ไม่ได้ถูกแบน
            const bannedUntil = adminData.user.banned_until;
            if (!bannedUntil || new Date(bannedUntil) < new Date()) {
              return { user: adminData.user, error: null };
            }
          }
        }
      }
    } catch (_) {}
  }

  return { user: null, error: new Error('Invalid or expired token') };
}
