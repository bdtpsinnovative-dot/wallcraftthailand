import { NextResponse } from 'next/server';
import { authenticateRequestUser, getSupabaseAdmin } from '@/app/lib/auth-helper';

const ALLOWED_PLATFORMS = new Set(['android', 'ios', 'web', 'other']);

function normalizeText(value: unknown, maxLen = 120): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function normalizePlatform(value: unknown): string {
  const raw = normalizeText(value, 20).toLowerCase();
  if (ALLOWED_PLATFORMS.has(raw)) return raw;
  return 'other';
}

function normalizeBuildNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, error: authError } = await authenticateRequestUser(
      request,
      typeof body?.token === 'string' ? body.token : null
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }

    const appVersion = normalizeText(body?.app_version, 64);
    if (!appVersion) {
      return NextResponse.json(
        { error: 'app_version is required' },
        { status: 400 }
      );
    }

    const platform = normalizePlatform(body?.platform);
    const buildNumber = normalizeBuildNumber(body?.build_number);
    const deviceBrand = normalizeText(body?.device_brand, 80);
    const deviceModel = normalizeText(body?.device_model, 100);
    const osVersion = normalizeText(body?.os_version, 64);
    const fallbackKey = `${platform}:${deviceBrand || 'unknown'}:${deviceModel || 'unknown'}`;
    const deviceKey = normalizeText(body?.device_key, 128) || fallbackKey;

    const nowIso = new Date().toISOString();
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('user_app_devices')
      .upsert(
        {
          user_id: user.id,
          device_key: deviceKey,
          platform,
          app_version: appVersion,
          build_number: buildNumber,
          device_brand: deviceBrand,
          device_model: deviceModel,
          os_version: osVersion,
          last_seen_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'user_id,device_key' }
      );

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.warn('[profile/device] Table user_app_devices not created yet.');
        return NextResponse.json({
          success: false,
          pending_migration: true,
        });
      }
      console.error('[profile/device] Upsert failed:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      last_seen_at: nowIso,
    });
  } catch (err: any) {
    console.error('[profile/device] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
