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

    // Get current week's Monday and Sunday
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

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
      .eq('status', 'pending')
      .gte('planned_date', startOfWeek.toISOString())
      .lte('planned_date', endOfWeek.toISOString())
      .order('planned_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ visit_plans: visitPlans });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
