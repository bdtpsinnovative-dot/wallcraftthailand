import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { messaging } from '../../../lib/firebase-admin';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function visitPlanErrorResponse(err: any) {
  const rawMessage = String(err?.message || err || 'Internal Server Error');
  const missingRequiredColumn = /(start_time|end_time|client_request_id)/i.test(rawMessage)
    && /(column|schema cache|does not exist|could not find)/i.test(rawMessage);

  if (missingRequiredColumn) {
    return NextResponse.json({
      code: 'VISIT_PLAN_REQUIRED_COLUMNS_MISSING',
      error: 'ฐานข้อมูลยังไม่มีคอลัมน์ที่จำเป็นสำหรับแผนงาน กรุณารัน SQL migration ก่อน',
    }, { status: 500 });
  }

  const code = err?.code ? String(err.code) : 'VISIT_PLAN_REQUEST_FAILED';
  let friendlyMessage = 'บันทึกแผนงานไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่';
  if (code === '23503') {
    friendlyMessage = 'ข้อมูลที่เลือกไม่ตรงกับข้อมูลในระบบ อาจเป็นบริษัท เซล หรือประเภทโครงการที่ถูกลบไปแล้ว';
  } else if (code === '22P02') {
    friendlyMessage = 'รูปแบบข้อมูลบางช่องไม่ถูกต้อง กรุณาเลือกข้อมูลใหม่แล้วลองอีกครั้ง';
  } else if (code === '42501') {
    friendlyMessage = 'ไม่มีสิทธิ์บันทึกแผนงานนี้ กรุณาเข้าสู่ระบบใหม่';
  }

  return NextResponse.json({
    code,
    error: friendlyMessage,
    details: err?.details || rawMessage,
    hint: err?.hint || null,
  }, { status: 500 });
}

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
    const assignedTo = searchParams.get('assigned_to');

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role, full_name')
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
        start_time,
        end_time,
        project_concept, 
        status, 
        is_deleted,
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
      .eq('is_deleted', false)
      .gte('planned_date', startDate.toISOString())
      .lte('planned_date', endDate.toISOString())
      .order('planned_date', { ascending: true });

    if (error) throw error;

    const normalizedPlans = (visitPlans || []).map((plan: any) => {
      const profile = Array.isArray(plan.profiles)
        ? plan.profiles[0]
        : plan.profiles;
      const assignedName = typeof profile?.full_name === 'string'
        ? profile.full_name.trim()
        : null;

      return {
        ...plan,
        assigned_name: assignedName,
      };
    });

    return NextResponse.json({ visit_plans: normalizedPlans });
  } catch (err: any) {
    console.error('[VisitPlans][GET] Error:', err);
    return visitPlanErrorResponse(err);
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
    const { planned_date, start_time, end_time, client_request_id, company_id, project_id, project_concept, project_type_id, product_category_id, user_id: assignedUserId } = body;

    if (!planned_date) {
      return NextResponse.json({ code: 'PLANNED_DATE_REQUIRED', error: 'กรุณาเลือกวันที่เข้าพบ' }, { status: 400 });
    }
    if (!company_id) {
      return NextResponse.json({ code: 'COMPANY_REQUIRED', error: 'กรุณาเลือกบริษัทก่อนบันทึกแผนงาน' }, { status: 400 });
    }

    if (client_request_id) {
      const { data: existingPlan, error: existingPlanError } = await supabase
        .from('visit_plans')
        .select('*')
        .eq('client_request_id', client_request_id)
        .maybeSingle();

      if (existingPlanError) throw existingPlanError;
      if (existingPlan) {
        return NextResponse.json({ ...existingPlan, already_created: true });
      }
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const isAdmin = requesterProfile?.role === 'admin';
    const targetUserId = (isAdmin && assignedUserId) ? assignedUserId : user.id;

    const { data, error } = await supabase
      .from('visit_plans')
      .insert({
        planned_date,
        start_time: start_time || null,
        end_time: end_time || null,
        client_request_id: client_request_id || null,
        company_id,
        project_id: project_id || null,
        project_concept: project_concept || null,
        project_type_id: project_type_id || null,
        product_category_id: product_category_id || null,
        user_id: targetUserId,
        status: 'pending',
        is_deleted: false
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

          let projectName = project_concept;
          if (project_id) {
            const { data: proj } = await supabase.from('projects').select('project_name').eq('id', project_id).single();
            if (proj) projectName = proj.project_name;
          }

          const message = {
            notification: { 
              title: 'คุณได้รับมอบหมายแผนงานใหม่', 
              body: `${requesterProfile.full_name || 'แอดมิน'} ได้มอบหมายแผนการเข้าพบลูกค้า ${companyName} ให้คุณ` 
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
    console.error('[VisitPlans][POST] Error:', err);
    return visitPlanErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
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
    const body = await request.json();
    const id = searchParams.get('id') || body.id;
    if (!id) {
      return NextResponse.json({ code: 'VISIT_PLAN_ID_REQUIRED', error: 'ไม่พบรหัสแผนงานที่ต้องการแก้ไข' }, { status: 400 });
    }
    if (!body.planned_date) {
      return NextResponse.json({ code: 'PLANNED_DATE_REQUIRED', error: 'กรุณาเลือกวันที่เข้าพบ' }, { status: 400 });
    }
    if (!body.company_id) {
      return NextResponse.json({ code: 'COMPANY_REQUIRED', error: 'กรุณาเลือกบริษัทก่อนบันทึกแผนงาน' }, { status: 400 });
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = requesterProfile?.role === 'admin';

    const updateData: Record<string, any> = {
      planned_date: body.planned_date,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      company_id: body.company_id,
      project_id: body.project_id || null,
      project_concept: body.project_concept || null,
      project_type_id: body.project_type_id || null,
      product_category_id: body.product_category_id || null,
    };
    if (isAdmin && body.user_id) updateData.user_id = body.user_id;

    let query = supabase.from('visit_plans').update(updateData).eq('id', id);
    if (!isAdmin) query = query.eq('user_id', user.id);

    const { data, error } = await query.select().single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ code: 'VISIT_PLAN_NOT_FOUND', error: 'ไม่พบแผนงานนี้ หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[VisitPlans][PATCH] Error:', err);
    return visitPlanErrorResponse(err);
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
