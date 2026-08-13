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

    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const startIso = ninetyDaysAgo.toISOString();

    const { data: projects, error } = await supabase
      .from('v_dashboard_projects')
      .select('company_id, company_name, project_name, created_at, area_sqm')
      .or('is_deleted.eq.false,is_deleted.is.null')
      .gte('created_at', startIso)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats: Record<string, { id: string, name: string, count: number, uniqueProjects: Record<string, string>, totalSqm: number }> = {};
    
    (projects || []).forEach(row => {
      const cId = row.company_id;
      const cName = row.company_name;
      if (!cId || !cName) return;

      if (!stats[cName]) stats[cName] = { id: cId, name: cName, count: 0, uniqueProjects: {}, totalSqm: 0 };
      
      stats[cName].count += 1;
      stats[cName].totalSqm += (Number(row.area_sqm) || 0);
      
      const projName = row.project_name?.trim();
      if (projName && projName !== 'ไม่มีการระบุโครงการ' && projName !== 'ไม่ระบุโครงการ') {
        const pDate = new Date(row.created_at);
        const existing = stats[cName].uniqueProjects[projName];
        if (!existing || pDate < new Date(existing)) {
          stats[cName].uniqueProjects[projName] = pDate.toISOString();
        }
      }
    });

    const repeatedVisits = Object.values(stats).filter(c => c.count >= 3).sort((a, b) => b.count - a.count);

    return NextResponse.json({ repeatedVisits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
