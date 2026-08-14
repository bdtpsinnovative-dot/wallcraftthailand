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

    // Check user profile (role, team_id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';

    // Helper to fetch orders with pagination
    const fetchOrders = async (filterFn: (q: any) => any) => {
      let allOrders: any[] = [];
      let start = 0;
      const limit = 1000;
      while (true) {
        let baseQuery = supabase
          .from('orders')
          .select(`
            company_id,
            user_id,
            team_id,
            audit_log,
            companies (id, name, customer_type_id),
            order_items (
              product_category_id,
              order_item_projects (
                id, project_name, project_type_id
              )
            )
          `);
        baseQuery = filterFn(baseQuery);
        const { data: chunk, error } = await baseQuery.range(start, start + limit - 1);
        if (error) throw error;
        if (!chunk || chunk.length === 0) break;
        allOrders = allOrders.concat(chunk);
        if (chunk.length < limit) break;
        start += limit;
      }
      return allOrders;
    };

    let myOrders: any[] = [];
    let teamOrders: any[] = [];
    let globalOrders: any[] = [];

    // Step 1: Always fetch my orders first (to count personal orders)
    myOrders = await fetchOrders((q) => q.eq('user_id', user.id));
    const myOrderCount = myOrders.length;

    // Determine how many team / global orders we need based on myOrderCount
    let needTeamOrGlobal = false;
    if (myOrderCount < 300 || isAdmin) {
      needTeamOrGlobal = true;
    }

    if (profile?.team_id) {
      teamOrders = await fetchOrders((q) => q.eq('team_id', profile.team_id).neq('user_id', user.id));
    }

    // Always fetch global orders so any company with GPS coordinates can be detected when nearby
    let globalFilter = (q: any) => q.neq('user_id', user.id);
    if (profile?.team_id) {
      globalFilter = (q: any) => q.neq('user_id', user.id).neq('team_id', profile.team_id);
    }
    globalOrders = await fetchOrders(globalFilter);

    const compMap = new Map();

    const processOrders = (orders: any[], isMine: boolean, isTeam: boolean, isGlobal: boolean) => {
      orders.forEach((order: any) => {
        if (!order.companies || !order.company_id) return;
        const cId = order.company_id;
        
        const lat = order.audit_log?.location?.lat;
        const lng = order.audit_log?.location?.lng;

        if (!compMap.has(cId)) {
          compMap.set(cId, { 
            company: order.companies, 
            projects: [], 
            count: 0, 
            user_ids: new Set(),
            is_mine: false,
            is_team: false,
            is_global: false
          });
        }
        const compData = compMap.get(cId);
        
        if (lat && lng) {
          compData.company.lat = lat;
          compData.company.lng = lng;
        }
        
        compData.count += 1;
        if (order.user_id) compData.user_ids.add(order.user_id);
        
        if (isMine) compData.is_mine = true;
        if (isTeam) compData.is_team = true;
        if (isGlobal) compData.is_global = true;

        order.order_items?.forEach((item: any) => {
          item.order_item_projects?.forEach((proj: any) => {
            if (proj.project_name) {
              const existingProj = compData.projects.find((p: any) => p.project_name === proj.project_name);
              if (!existingProj) {
                compData.projects.push({
                  id: proj.id,
                  project_name: proj.project_name,
                  project_type_id: proj.project_type_id,
                  product_category_id: item.product_category_id,
                  is_mine: isMine
                });
              } else if (isMine) {
                existingProj.is_mine = true;
              }
            }
          });
        });
      });
    };

    processOrders(myOrders, true, false, false);
    processOrders(teamOrders, false, true, false);
    processOrders(globalOrders, false, false, true);

    const allCompanies = Array.from(compMap.values()).map(p => ({
      ...p,
      user_ids: Array.from(p.user_ids)
    }));

    // Split and sort by frequency (visit count)
    const mineList = allCompanies.filter(c => c.is_mine).sort((a, b) => b.count - a.count);
    const teamList = allCompanies.filter(c => !c.is_mine && c.is_team).sort((a, b) => b.count - a.count);
    const globalList = allCompanies.filter(c => !c.is_mine && !c.is_team && c.is_global).sort((a, b) => b.count - a.count);

    const TOTAL_SLOTS = 50;
    const pipeline: any[] = [];

    if (myOrderCount >= 300) {
      // 100% Personal, 0% Team
      pipeline.push(...mineList.slice(0, 50));
    } else if (myOrderCount >= 100) {
      // 90% Personal, 10% Team (Strictly max 5 team companies at the bottom)
      const personalToAdd = mineList.slice(0, 45);
      const teamToAdd = teamList.slice(0, 5);
      pipeline.push(...personalToAdd);
      for (const c of teamToAdd) {
        c.is_team = true;
        pipeline.push(c);
      }
    } else if (myOrderCount >= 50) {
      // 80% Personal, 20% Team (Strictly max 10 team companies at the bottom)
      const personalToAdd = mineList.slice(0, 40);
      const teamToAdd = teamList.slice(0, 10);
      pipeline.push(...personalToAdd);
      for (const c of teamToAdd) {
        c.is_team = true;
        pipeline.push(c);
      }
    } else {
      // < 50 orders: New employee, fill up to 50 slots
      pipeline.push(...mineList);
      for (const c of teamList) {
        if (pipeline.length >= TOTAL_SLOTS) break;
        c.is_team = true;
        pipeline.push(c);
      }
      for (const c of globalList) {
        if (pipeline.length >= TOTAL_SLOTS) break;
        c.is_global = true;
        pipeline.push(c);
      }
    }

    return NextResponse.json({ pipeline });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
