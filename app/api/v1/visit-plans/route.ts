import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or Expired Token' }, { status: 401 });
    }

    // Get range: 4 weeks ago to 8 weeks in future
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startDate = new Date(startOfWeek);
    startDate.setDate(startDate.getDate() - (4 * 7)); // 4 weeks ago
    
    const endDate = new Date(startOfWeek);
    endDate.setDate(endDate.getDate() + (8 * 7) - 1); // 8 weeks future
    endDate.setHours(23, 59, 59, 999);

    const { data: visitPlans, error } = await supabase
      .from('visit_plans')
      .select(`
        id, 
        planned_date, 
        project_concept, 
        status, 
        user_id, 
        company_id, 
        project_id, 
        project_type_id, 
        product_category_id,
        companies (id, name, customer_type_id),
        projects (id, project_name),
        project_types (id, name),
        product_categories (id, name)
      `)
      .eq('user_id', user.id)
      .gte('planned_date', startDate.toISOString())
      .lte('planned_date', endDate.toISOString())
      .order('planned_date', { ascending: true });

    if (error) throw error;

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, line_picture_url')
      .eq('id', user.id)
      .single();

    const plansWithProfile = visitPlans?.map(plan => ({
      ...plan,
      profiles: userProfile
    })) || [];

    return NextResponse.json({ visit_plans: plansWithProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or Expired Token' }, { status: 401 });
    }

    const body = await request.json();
    const { planned_date, company_id, project_id, project_concept, project_type_id, product_category_id } = body;

    const { data, error } = await supabase
      .from('visit_plans')
      .insert({
        planned_date,
        company_id,
        project_id: project_id || null,
        project_concept: project_concept || null,
        project_type_id: project_type_id || null,
        product_category_id: product_category_id || null,
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or Expired Token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { error } = await supabase
      .from('visit_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user can only delete their own

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
