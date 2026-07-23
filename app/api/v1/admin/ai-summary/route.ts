import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const AI_API_KEY = process.env.GEMINI_API_KEY;

let aiCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 10 * 60 * 1000; 

const toArray = (data: any) => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filter = searchParams.get('filter') || 'all';
    const teamFilter = searchParams.get('team') || 'all'; 
    const personFilter = searchParams.get('person') || 'all'; 
    const sourceFilter = searchParams.get('source') || 'all';
    const projectTypeId = searchParams.get('project_type_id') || 'all';
    const productCategoryId = searchParams.get('product_category_id') || 'all';
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const minArea = searchParams.get('min_area');
    const maxArea = searchParams.get('max_area');

    const cacheKey = [filter, teamFilter, personFilter, sourceFilter, projectTypeId, productCategoryId, startDateParam, endDateParam, minArea, maxArea].join('_');
    const now = Date.now();
    if (aiCache[cacheKey] && now - aiCache[cacheKey].timestamp < CACHE_DURATION) {
      return NextResponse.json(aiCache[cacheKey].data);
    }

    const [pTypes, pCats] = await Promise.all([
      supabase.from('project_types').select('id, name'),
      supabase.from('product_categories').select('id, name')
    ]);

    let queryStart = null;
    let queryEnd = null;
    let timeLabel = "ทั้งหมด";
    const dateRef = new Date();

    if (startDateParam) {
      queryStart = new Date(`${startDateParam}T00:00:00+07:00`).toISOString();
      timeLabel = startDateParam;
      if (endDateParam) {
        queryEnd = new Date(`${endDateParam}T23:59:59+07:00`).toISOString();
        if (startDateParam !== endDateParam) timeLabel += ` ถึง ${endDateParam}`;
      }
    } else {
      if (filter === 'daily') {
        queryStart = new Date(dateRef.setHours(0, 0, 0, 0)).toISOString();
        timeLabel = "วันนี้";
      } else if (filter === 'weekly') {
        const lastWeek = new Date(dateRef.setDate(dateRef.getDate() - 7));
        queryStart = lastWeek.toISOString();
        timeLabel = "7 วันล่าสุด";
      } else if (filter === 'monthly') {
        const startOfMonth = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1);
        queryStart = startOfMonth.toISOString();
        timeLabel = "เดือนนี้";
      }
    }

    // 🚀 Parallel Page Fetching for High Speed
    let baseQuery = supabase
      .from('order_item_projects')
      .select(`
        area_sqm, is_important, project_name, created_at, project_type_id,
        order_items (interest_level, product_category_id, product_categories (name), orders (customer_name, audit_log, source, teams (team_name), profiles (full_name)))
      `, { count: 'exact' })
      .or('is_deleted.eq.false,is_deleted.is.null');

    if (queryStart) baseQuery = baseQuery.gte('created_at', queryStart);
    if (queryEnd) baseQuery = baseQuery.lte('created_at', queryEnd);
    if (projectTypeId !== 'all') baseQuery = baseQuery.eq('project_type_id', projectTypeId);
    if (minArea) baseQuery = baseQuery.gte('area_sqm', minArea);
    if (maxArea) baseQuery = baseQuery.lte('area_sqm', maxArea);

    const limit = 1000;
    const { data: firstPage, count: totalCount, error: dbError } = await baseQuery.range(0, limit - 1);
    if (dbError) throw new Error(`DB Error: ${dbError.message}`);

    let allRawStats: any[] = firstPage || [];

    if (totalCount && totalCount > limit) {
      const promises = [];
      for (let offset = limit; offset < totalCount; offset += limit) {
        let pQuery = supabase
          .from('order_item_projects')
          .select(`
            area_sqm, is_important, project_name, created_at, project_type_id,
            order_items (interest_level, product_category_id, product_categories (name), orders (customer_name, audit_log, source, teams (team_name), profiles (full_name)))
          `)
          .or('is_deleted.eq.false,is_deleted.is.null');

        if (queryStart) pQuery = pQuery.gte('created_at', queryStart);
        if (queryEnd) pQuery = pQuery.lte('created_at', queryEnd);
        if (projectTypeId !== 'all') pQuery = pQuery.eq('project_type_id', projectTypeId);
        if (minArea) pQuery = pQuery.gte('area_sqm', minArea);
        if (maxArea) pQuery = pQuery.lte('area_sqm', maxArea);

        promises.push(pQuery.range(offset, offset + limit - 1));
      }
      const results = await Promise.all(promises);
      results.forEach(({ data, error }) => {
        if (error) console.error("Chunk Fetch Error:", error);
        if (data) allRawStats.push(...data);
      });
    }

    const rawStats = allRawStats;
    if (!rawStats || rawStats.length === 0) {
      return NextResponse.json({
        summary_date: new Date().toLocaleDateString('th-TH'),
        time_filter: filter,
        time_label: timeLabel,
        ai_insight: "ยังไม่มีข้อมูลสถิติในช่วงเวลาที่เลือกครับ",
        available_teams: [],
        available_persons: [],
        project_types: pTypes.data || [],
        product_categories: pCats.data || [],
        stats: {
          total_orders: 0,
          total_checkins: 0,
          total_area_sqm: "0.00",
          important_count: 0,
          team_performance: {},
          person_performance: {},
          source_performance: { "APP": 0, "IMPORT": 0 }
        }
      });
    }

    const availableTeams = [...new Set(
      rawStats.flatMap((s: any) => 
        toArray(s.order_items).flatMap((item: any) => 
          toArray(item.orders).map((o: any) => o?.teams?.team_name)
        )
      ).filter(Boolean)
    )];

    const availablePersons = [...new Set(
      rawStats.flatMap((s: any) => 
        toArray(s.order_items).flatMap((item: any) => 
          toArray(item.orders).map((o: any) => o?.profiles?.full_name)
        )
      ).filter(Boolean)
    )];

    let allValidCheckins = rawStats.filter((s: any) => {
      const item = toArray(s.order_items)[0];
      const order = toArray(item?.orders)[0];

      if (teamFilter !== 'all' && order?.teams?.team_name !== teamFilter) return false;
      if (personFilter !== 'all' && order?.profiles?.full_name !== personFilter) return false;
      if (productCategoryId !== 'all' && item?.product_category_id !== productCategoryId) return false;
      
      const isImported = order?.audit_log === null || order?.audit_log === undefined;
      const currentSource = isImported ? "IMPORT" : "APP";
      if (sourceFilter !== 'all' && currentSource !== sourceFilter) return false;

      return true;
    });

    const totalCheckinsCount = allValidCheckins.length;

    const sourceSummary: any = { "APP": 0, "IMPORT": 0 };
    allValidCheckins.forEach((s: any) => {
      const item = toArray(s.order_items)[0];
      const order = toArray(item?.orders)[0];
      const isImported = order?.audit_log === null || order?.audit_log === undefined;
      const currentSource = isImported ? "IMPORT" : "APP";
      sourceSummary[currentSource] += 1;
    });

    let stats = allValidCheckins.filter((s: any) => {
      if (s.project_name && s.project_name.includes('ไม่มีการระบุโครงการ')) {
        return false;
      }
      return true;
    });

    const totalProjectsCount = stats.length; 
    const totalSqm = stats.reduce((acc: number, curr: any) => acc + (Number(curr.area_sqm) || 0), 0);
    const importantCount = stats.filter((s: any) => s.is_important).length;
    
    const teamSummary: any = {};
    const personSummary: any = {}; 

    stats.forEach((s: any) => {
      const areaSqm = Number(s.area_sqm) || 0; 

      toArray(s.order_items).forEach((item: any) => {
        toArray(item.orders).forEach((o: any) => {
          const teamName = o?.teams?.team_name || 'ไม่มีทีม';
          const personName = o?.profiles?.full_name || 'ไม่ระบุตัวตน';

          if (!teamSummary[teamName]) teamSummary[teamName] = { count: 0, area: 0 };
          teamSummary[teamName].count += 1;
          teamSummary[teamName].area += areaSqm;

          if (!personSummary[personName]) personSummary[personName] = { count: 0, area: 0 };
          personSummary[personName].count += 1;
          personSummary[personName].area += areaSqm;
        });
      });
    });

    let aiSummary = "";
    const contextForAi = `สถิติช่วง ${timeLabel}: มีการเช็คอินทั้งหมด ${totalCheckinsCount} ครั้ง, ได้โครงการ ${totalProjectsCount} โครงการ, พื้นที่รวม ${totalSqm.toFixed(2)} ตร.ม., สรุปรายทีม: ${JSON.stringify(teamSummary)}, สรุปรายบุคคล: ${JSON.stringify(personSummary)}`;

    try {
      if (!AI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
      // 🚀 Use fast & official gemini-1.5-flash model
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `คุณคือ AI ผู้ช่วยแอดมินก่อสร้าง จากข้อมูลสถิติช่วง ${timeLabel} นี้: ${contextForAi} ช่วยสรุปสถานการณ์สั้นๆ 3 บรรทัด ว่าภาพรวมเป็นยังไง ใครหรือทีมไหนเด่น` }] }]
        })
      });
      const aiData = await aiResponse.json();
      if (aiData.candidates && aiData.candidates.length > 0) {
        aiSummary = aiData.candidates[0].content.parts[0].text;
      } else {
        aiSummary = "ภาพรวมผลงานคงที่ ทีมขายดำเนินการติดตามโครงการตามแผนงานอย่างต่อเนื่อง";
      }
    } catch (e) {
      aiSummary = "ภาพรวมผลงานคงที่ ทีมขายดำเนินการติดตามโครงการตามแผนงานอย่างต่อเนื่อง";
    }

    // 📊 คำนวณกราฟแนวโน้มโครงการย้อนหลัง 7 วันตามข้อมูลจริงจาก DB
    const dailyTrendMap: { [key: string]: number } = {};
    const dateLabels: string[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      dateLabels.push(dateStr);
      dailyTrendMap[dateStr] = 0;
    }

    stats.forEach((s: any) => {
      if (s.created_at) {
        const dt = new Date(s.created_at);
        const dateStr = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
        if (dailyTrendMap[dateStr] !== undefined) {
          dailyTrendMap[dateStr] += 1;
        }
      }
    });

    const dailyTrend = dateLabels.map(date => ({
      date,
      count: dailyTrendMap[date] || 0
    }));

    const finalResponse = {
      summary_date: new Date().toLocaleDateString('th-TH'),
      time_filter: filter,
      time_label: timeLabel,
      ai_insight: aiSummary,
      available_teams: availableTeams,
      available_persons: availablePersons,
      project_types: pTypes.data || [],       
      product_categories: pCats.data || [],   
      stats: { 
        total_orders: totalProjectsCount, 
        total_checkins: totalCheckinsCount, 
        total_area_sqm: totalSqm.toFixed(2), 
        important_count: importantCount, 
        team_performance: teamSummary,
        person_performance: personSummary,
        source_performance: sourceSummary,
        daily_trend: dailyTrend
      }
    };

    if (!aiSummary.includes("Quota Limit")) aiCache[cacheKey] = { data: finalResponse, timestamp: now };
    return NextResponse.json(finalResponse);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, stats, history } = body;

    if (!AI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    const systemContext = `คุณคือ AI ช่วยวิเคราะห์ข้อมูลก่อสร้าง ข้อมูลปัจจุบันคือ: เช็คอินทั้งหมด ${stats?.total_checkins || 0} ครั้ง, ได้โครงการ ${stats?.total_orders || 0} โครงการ, พื้นที่รวม ${stats?.total_area_sqm || 0} ตร.ม., งานสำคัญ ${stats?.important_count || 0} โครงการ, สรุปรายทีม: ${JSON.stringify(stats?.team_performance || {})}. กรุณาตอบคำถามแอดมินสั้นๆ กระชับ`;

    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    formattedHistory.push({
      role: 'user',
      parts: [{ text: `[บริบท: ${systemContext}]\n\nคำถาม: ${message}` }]
    });

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: formattedHistory })
    });

    const aiData = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(aiData.error?.message || "AI Chat API Error");

    let reply = "ขออภัยครับ ไม่สามารถประมวลผลคำตอบได้";
    if (aiData.candidates && aiData.candidates.length > 0) {
      reply = aiData.candidates[0].content.parts[0].text;
    }
    return NextResponse.json({ reply: reply });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}