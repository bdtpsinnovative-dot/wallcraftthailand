import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { messaging } from '../../../lib/firebase-admin';

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

    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assigned_to');

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = requesterProfile?.role === 'admin';

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

    let query = supabase
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
        product_categories (id, name),
        profiles (id, full_name, avatar_url)
      `);

    if (isAdmin) {
      if (assignedTo && assignedTo !== 'all') {
        query = query.eq('user_id', assignedTo);
      }
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: visitPlans, error } = await query
      .gte('planned_date', startDate.toISOString())
      .lte('planned_date', endDate.toISOString())
      .order('planned_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ visit_plans: visitPlans || [] });
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
    const { planned_date, company_id, project_id, project_concept, project_type_id, product_category_id, user_id: assignedUserId } = body;

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = requesterProfile?.role === 'admin';
    const targetUserId = (isAdmin && assignedUserId) ? assignedUserId : user.id;

    const { data, error } = await supabase
      .from('visit_plans')
      .insert({
        planned_date,
        company_id,
        project_id: project_id || null,
        project_concept: project_concept || null,
        project_type_id: project_type_id || null,
        product_category_id: product_category_id || null,
        user_id: targetUserId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification if admin assigns to someone else
    if (isAdmin && targetUserId !== user.id) {
      try {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('fcm_tokens, full_name')
          .eq('id', targetUserId)
          .single();

        const rawTokens = targetProfile?.fcm_tokens;
        const fcmTokens = Array.isArray(rawTokens) 
          ? rawTokens.map((entry: any) => {
              if (typeof entry === 'string') return entry;
              if (entry && typeof entry === 'object' && 'token' in entry) {
                return typeof entry.token === 'string' ? entry.token : null;
              }
              return null;
            }).filter(Boolean)
          : [];

        if (fcmTokens.length > 0) {
          let companyName = 'ไม่ระบุบริษัท';
          if (company_id) {
            const { data: comp } = await supabase.from('companies').select('name').eq('id', company_id).single();
            if (comp) companyName = comp.name;
          }

          let projectName = project_concept || 'ไม่มีชื่อโครงการ';
          if (project_id) {
            const { data: proj } = await supabase.from('projects').select('project_name').eq('id', project_id).single();
            if (proj) projectName = proj.project_name;
          }

          const message = {
            notification: { 
              title: `Visit : ${companyName}`, 
              body: `ได้รับโครงการ : ${projectName}\nเซลส์ : ${requesterProfile.full_name || 'แอดมิน'}` 
            },
            data: { type: 'new_visit_plan' },
            tokens: fcmTokens as string[],
            android: { priority: 'high' as const },
            apns: { payload: { aps: { sound: 'default', badge: 1 } } },
          };
          await messaging.sendEachForMulticast(message);
        }
      } catch (notifyErr) {
        console.error("Failed to send assignment notification:", notifyErr);
      }
    }

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

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = requesterProfile?.role === 'admin';

    let query = supabase.from('visit_plans').delete().eq('id', id);
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
