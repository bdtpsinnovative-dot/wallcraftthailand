import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const INVALID_REFRESH_CODES = new Set([
  'invalid_credentials',
  'refresh_token_already_used',
  'refresh_token_not_found',
]);

type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
};

function asAuthFailure(error: unknown): AuthFailure {
  if (typeof error !== 'object' || error === null) return {};
  return error as AuthFailure;
}

function isInvalidRefreshGrant(error: unknown) {
  const code = asAuthFailure(error).code?.toLowerCase();
  return code !== undefined && INVALID_REFRESH_CODES.has(code);
}

function isTransient(error: unknown) {
  const status = asAuthFailure(error).status;
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

function errorMessage(error: unknown) {
  return asAuthFailure(error).message || 'Failed to refresh token';
}

export async function POST(request: Request) {
  let refreshToken: unknown;
  try {
    const body = await request.json();
    refreshToken = body?.refresh_token;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
    return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing on server' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });

    let lastError: unknown;
    let sessionData: Awaited<ReturnType<typeof supabase.auth.refreshSession>>['data'] | null = null;

    // Retry up to 3 attempts with exponential backoff for network resilience / Supabase cold starts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!result.error && result.data?.session) {
          sessionData = result.data;
          lastError = undefined;
          break;
        }

        lastError = result.error;
        if (isInvalidRefreshGrant(result.error) || !isTransient(result.error)) {
          break;
        }
      } catch (err: unknown) {
        lastError = err;
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      }
    }

    if (lastError || !sessionData?.session) {
      const failure = asAuthFailure(lastError);
      const invalidGrant = isInvalidRefreshGrant(lastError);

      return NextResponse.json(
        {
          error: errorMessage(lastError),
          error_code: failure.code,
          is_invalid_grant: invalidGrant,
        },
        { status: invalidGrant ? 401 : 503 }
      );
    }

    return NextResponse.json({
      session: sessionData.session,
      user: sessionData.user,
    });
  } catch {
    return NextResponse.json(
      { error: 'Authentication service temporarily unavailable', is_invalid_grant: false },
      { status: 503 }
    );
  }
}
