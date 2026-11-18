import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getCachedProjects } from '@/app/lib/public-cache';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// API สำหรับสร้างโครงการใหม่
export async function POST(request: Request) {
  try {
    const { project_name } = await request.json();

    if (!project_name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ project_name })
      .select('id, project_name')
      .single();

    if (error) throw error;

    // Auto-purge projects + New Record bootstrap cache immediately
    revalidateTag(CACHE_TAGS.PROJECTS, { expire: 0 });

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// API สำหรับดึงข้อมูลโครงการทั้งหมด (แคช 1 ปีบน Server, ล้างออโต้เมื่อเพิ่มโครงการใหม่)
export async function GET() {
  try {
    const data = await getCachedProjects();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
