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
    let targetPersonalRatio = 1.0;
    let targetTeamRatio = 0.0;

    if (myOrderCount < 50) {
      targetPersonalRatio = 0.5;
      targetTeamRatio = 0.5;
    } else if (myOrderCount < 100) {
      targetPersonalRatio = 0.8; // 80% Personal, 20% Team
      targetTeamRatio = 0.2;
    } else if (myOrderCount < 300) {
      targetPersonalRatio = 0.9; // 90% Personal, 10% Team
      targetTeamRatio = 0.1;
    } else {
      targetPersonalRatio = 1.0; // 100% Personal, 0% Team
      targetTeamRatio = 0.0;
    }

    const maxPersonal = Math.round(TOTAL_SLOTS * targetPersonalRatio);
    const maxTeam = TOTAL_SLOTS - maxPersonal;

    const pipeline: any[] = [];

    // 1. Add Personal companies (up to maxPersonal)
    const personalToAdd = mineList.slice(0, maxPersonal);
    pipeline.push(...personalToAdd);

    // 2. Add Team companies (up to maxTeam)
    if (maxTeam > 0) {
      const teamToAdd = teamList.slice(0, maxTeam);
      for (const c of teamToAdd) {
        c.is_team = true;
        pipeline.push(c);
      }
    }

    // 3. If still below TOTAL_SLOTS and orderCount < 300, fill remaining gap
    if (myOrderCount < 300 && pipeline.length < TOTAL_SLOTS) {
      const remainingPersonal = mineList.slice(maxPersonal);
      for (const c of remainingPersonal) {
        if (pipeline.length >= TOTAL_SLOTS) break;
        pipeline.push(c);
      }

      const remainingTeam = teamList.slice(maxTeam);
      for (const c of remainingTeam) {
        if (pipeline.length >= TOTAL_SLOTS) break;
        c.is_team = true;
        pipeline.push(c);
      }

      if (myOrderCount < 50) {
        for (const c of globalList) {
          if (pipeline.length >= TOTAL_SLOTS) break;
          c.is_global = true;
          pipeline.push(c);
        }
      }
    }

    // 4. Append all other companies with GPS coordinates (so mobile app can detect proximity <= 750m)
    const includedIds = new Set(pipeline.map(p => p.company.id));
    for (const c of allCompanies) {
      if (!includedIds.has(c.company.id)) {
        if (c.company.lat && c.company.lng) {
          pipeline.push({
            ...c,
            is_mine: false,
            is_team: false,
            is_global: false
          });
          includedIds.add(c.company.id);
        }
      }
    }

    return NextResponse.json({ pipeline });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
