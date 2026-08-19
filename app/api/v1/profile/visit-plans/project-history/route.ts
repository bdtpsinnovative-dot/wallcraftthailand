import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Dedicated endpoint for the new visit-plan form.
// It does not change the existing /profile/pipeline response used by other screens.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or Expired Token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const requestedUserId = searchParams.get('user_id');
    if (!companyId) {
      return NextResponse.json({ code: 'COMPANY_REQUIRED', error: 'กรุณาเลือกบริษัทก่อนค้นหาโครงการ' }, { status: 400 });
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = requesterProfile?.role === 'admin';
    const targetUserId = isAdmin && requestedUserId ? requestedUserId : user.id;

    let ordersQuery = supabase
      .from('orders')
      .select(`
        user_id,
        order_items (
          product_category_id,
          order_item_projects (id, project_name, project_type_id)
        )
      `)
      .eq('company_id', companyId);
    let plansQuery = supabase
      .from('visit_plans')
      .select(`
        user_id,
        project_id,
        project_type_id,
        product_category_id,
        projects (id, project_name)
      `)
      .eq('company_id', companyId);

    // Non-admins can only inspect their own history. Admins can inspect the
    // selected salesperson's history and the other projects under this company.
    if (!isAdmin) {
      ordersQuery = ordersQuery.eq('user_id', targetUserId);
      plansQuery = plansQuery.eq('user_id', targetUserId);
    }

    const [ordersResult, plansResult] = await Promise.all([
      ordersQuery.limit(1000),
      plansQuery.limit(1000),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (plansResult.error) throw plansResult.error;

    const projects = new Map<string, any>();
    const addProject = (project: any, ownerId: string | null, categoryId?: any, typeId?: any) => {
      const id = project?.id?.toString();
      const name = project?.project_name?.toString().trim();
      if (!id || !name || name === '-') return;

      const existing = projects.get(id) || {
        id,
        project_name: name,
        project_type_id: project?.project_type_id ?? typeId ?? null,
        product_category_id: project?.product_category_id ?? categoryId ?? null,
        is_mine: false,
      };
      if (ownerId === targetUserId) existing.is_mine = true;
      if (existing.project_type_id == null) existing.project_type_id = project?.project_type_id ?? typeId ?? null;
      if (existing.product_category_id == null) existing.product_category_id = project?.product_category_id ?? categoryId ?? null;
      projects.set(id, existing);
    };

    for (const order of ordersResult.data || []) {
      for (const item of order.order_items || []) {
        for (const project of item.order_item_projects || []) {
          addProject(project, order.user_id, item.product_category_id);
        }
      }
    }

    for (const plan of plansResult.data || []) {
      const project = Array.isArray(plan.projects) ? plan.projects[0] : plan.projects;
      addProject(project || { id: plan.project_id }, plan.user_id, plan.product_category_id, plan.project_type_id);
    }

    const result = Array.from(projects.values()).sort((a, b) => {
      if (a.is_mine !== b.is_mine) return a.is_mine ? -1 : 1;
      return a.project_name.localeCompare(b.project_name, 'th');
    });

    return NextResponse.json({ company_id: companyId, user_id: targetUserId, projects: result });
  } catch (err: any) {
    console.error('[VisitPlanProjectHistory] Error:', err);
    return NextResponse.json({
      code: err?.code || 'VISIT_PLAN_PROJECT_HISTORY_FAILED',
      error: 'โหลดโครงการของบริษัทไม่สำเร็จ',
      details: err?.message || String(err),
    }, { status: 500 });
  }
}
