import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 🔥 คำสั่งขอ Session ใหม่ด้วย Refresh Token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refresh_token,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      session: data.session,
      user: data.user
    });

  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}