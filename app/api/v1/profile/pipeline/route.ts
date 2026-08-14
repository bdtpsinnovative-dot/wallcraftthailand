import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ⚡ Server-Side Cache for Pipeline (5 mins TTL)
const pipelineCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidatePipelineCache(userId?: string) {
  if (userId) {
    for (const key of pipelineCache.keys()) {
      if (key.includes(userId)) pipelineCache.delete(key);
    }
  } else {
    pipelineCache.clear();
  }
}

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

    // 🎯 Support optional target user_id (e.g. for Admin assigning visit plans)
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('user_id');
    
    let effectiveUserId = user.id;
    let effectiveTeamId = profile?.team_id;

    if (requestedUserId && (isAdmin || requestedUserId === user.id)) {
      effectiveUserId = requestedUserId;
      if (requestedUserId !== user.id) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', requestedUserId)
          .maybeSingle();
        effectiveTeamId = targetProfile?.team_id || effectiveTeamId;
      }
    }

    // ⚡ Check Server Cache first (Instant ~5ms response!)
    const cacheKey = `${effectiveUserId}_${effectiveTeamId || 'noteam'}_${isAdmin}`;
    const cached = pipelineCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cached.data);
    }

    // Helper to fetch orders with pagination
    const fetchOrders = async (filterFn: (q: any) => any) => {
      let allOrders: any[] = [];
      let start = 0;
      const limit = 1000;
      const selectFields = `
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
      `;

      while (true) {
        let baseQuery = supabase.from('orders').select(selectFields);
        baseQuery = filterFn(baseQuery);
        const { data: chunk, error } = await baseQuery.range(start, start + limit - 1);
        if (error) {
          console.error("❌ Supabase orders query error:", error);
          throw error;
        }
        if (!chunk || chunk.length === 0) break;
        allOrders = allOrders.concat(chunk);
        if (chunk.length < limit) break;
        start += limit;
      }
      return allOrders;
    };

    // 🚀 Parallel Query Execution (ยิงพร้อมกัน 3 เส้น ไม่ต้องรอคิว)
    let globalFilter = (q: any) => q.neq('user_id', effectiveUserId);
    if (effectiveTeamId) {
      globalFilter = (q: any) => q.neq('user_id', effectiveUserId).neq('team_id', effectiveTeamId);
    }

    const [myOrders, teamOrders, globalOrders] = await Promise.all([
      fetchOrders((q) => q.eq('user_id', effectiveUserId)),
      effectiveTeamId ? fetchOrders((q) => q.eq('team_id', effectiveTeamId).neq('user_id', effectiveUserId)) : Promise.resolve([]),
      fetchOrders(globalFilter),
    ]);

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
    // If it's my company, is_team must be false so it always shows as personal (🏢)
    const mineList = allCompanies
      .filter(c => c.is_mine)
      .map(c => ({ ...c, is_team: false, is_global: false }))
      .sort((a, b) => b.count - a.count);
    const teamList = allCompanies
      .filter(c => !c.is_mine && c.is_team)
      .sort((a, b) => b.count - a.count);
    const globalList = allCompanies
      .filter(c => !c.is_mine && !c.is_team && c.is_global)
      .sort((a, b) => b.count - a.count);

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

    const responsePayload = { pipeline };
    pipelineCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });

    return NextResponse.json(responsePayload);

  } catch (err: any) {
    console.error("❌ [Pipeline Error]:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
