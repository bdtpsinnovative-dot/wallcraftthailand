import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// API สำหรับสร้างโครงการใหม่
export async function POST(request: Request) {
  try {
    const { project_name } = await request.json();

    if (!project_name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ project_name })
      .select('id, project_name')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// API สำหรับดึงข้อมูลโครงการทั้งหมด
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name', { ascending: true })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}