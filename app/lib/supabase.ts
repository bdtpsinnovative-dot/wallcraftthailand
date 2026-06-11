// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const urlBall = process.env.NEXT_PUBLIC_SUPABASE_URLBALL;
const keyBall = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEYBALL;

if (!url || !key) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

const defaultSupabase = url && key ? createClient(url, key) : null;
const ballSupabase = urlBall && keyBall ? createClient(urlBall, keyBall) : defaultSupabase;

if ((!urlBall || !keyBall) && defaultSupabase) {
  console.warn('Missing BALL Supabase keys; using the default Supabase client instead.');
}

export const supabase = defaultSupabase as any;
export const supabaseBall = ballSupabase as any;
