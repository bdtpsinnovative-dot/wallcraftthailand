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

    // ดึง Orders ของ User เพื่อสร้าง Pipeline
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        company_id,
        companies (id, name, customer_type_id),
        order_items (
          product_category_id,
          order_item_projects (
            id, project_name, project_type_id
          )
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    const compMap = new Map();

    if (orders) {
      orders.forEach((order: any) => {
        if (!order.companies || !order.company_id) return;
        const cId = order.company_id;
        
        if (!compMap.has(cId)) {
          compMap.set(cId, { company: order.companies, projects: [], count: 0 });
        }
        const compData = compMap.get(cId);
        
        // Increment count for every order (represents a visit)
        compData.count += 1;
        
        order.order_items?.forEach((item: any) => {
          item.order_item_projects?.forEach((proj: any) => {
            if (proj.project_name) {
              // Avoid duplicate projects by name
              if (!compData.projects.find((p: any) => p.project_name === proj.project_name)) {
                compData.projects.push({
                  id: proj.id,
                  project_name: proj.project_name,
                  project_type_id: proj.project_type_id,
                  product_category_id: item.product_category_id
                });
              }
            }
          });
        });
      });
    }

    const pipeline = Array.from(compMap.values()).sort((a, b) => b.count - a.count);
    return NextResponse.json({ pipeline });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
