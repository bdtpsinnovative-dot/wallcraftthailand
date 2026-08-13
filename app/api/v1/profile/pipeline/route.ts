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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';

    // Fetch Orders for Pipeline
    let query = supabase
      .from('orders')
      .select(`
        company_id,
        user_id,
        companies (id, name, customer_type_id),
        order_items (
          product_category_id,
          order_item_projects (
            id, project_name, project_type_id
          )
        )
      `);

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    let allOrders: any[] = [];
    let start = 0;
    const limit = 1000;
    
    while (true) {
      const { data: chunk, error } = await query.range(start, start + limit - 1);
      if (error) throw error;
      if (!chunk || chunk.length === 0) break;
      allOrders = allOrders.concat(chunk);
      if (chunk.length < limit) break;
      start += limit;
    }

    const compMap = new Map();

    if (allOrders.length > 0) {
      allOrders.forEach((order: any) => {
        if (!order.companies || !order.company_id) return;
        const cId = order.company_id;
        
        const lat = order.audit_log?.location?.lat;
        const lng = order.audit_log?.location?.lng;

        if (!compMap.has(cId)) {
          compMap.set(cId, { company: order.companies, projects: [], count: 0, user_ids: new Set() });
        }
        const compData = compMap.get(cId);
        
        if (lat && lng) {
          compData.company.lat = lat;
          compData.company.lng = lng;
        }
        
        // Increment count for every order (represents a visit)
        compData.count += 1;
        if (order.user_id) compData.user_ids.add(order.user_id);
        
        order.order_items?.forEach((item: any) => {
          item.order_item_projects?.forEach((proj: any) => {
            if (proj.project_name) {
              // Avoid duplicate projects by name
              const existingProj = compData.projects.find((p: any) => p.project_name === proj.project_name);
              if (!existingProj) {
                compData.projects.push({
                  id: proj.id,
                  project_name: proj.project_name,
                  project_type_id: proj.project_type_id,
                  product_category_id: item.product_category_id,
                  is_mine: order.user_id === user.id
                });
              } else if (order.user_id === user.id) {
                existingProj.is_mine = true;
              }
            }
          });
        });
      });
    }

    const pipeline = Array.from(compMap.values()).map(p => ({
      ...p,
      user_ids: Array.from(p.user_ids)
    })).sort((a, b) => b.count - a.count);
    return NextResponse.json({ pipeline });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
