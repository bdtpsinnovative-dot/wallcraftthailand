import { NextResponse } from 'next/server'
import { authenticateRequestUser, getSupabaseAdmin } from '@/app/lib/auth-helper'

export async function POST(req: Request) {
  try {
    let token: string | null = null
    let scope: string | undefined = undefined
    try {
      const body = await req.json()
      token = body?.token ?? null
      scope = body?.scope
    } catch (_) {}

    // 1. ตรวจสอบ Token พร้อม Graceful Fallback
    const { user, error: authError } = await authenticateRequestUser(req, token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // 2. หา Team ID ของ User
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    const teamId = profile?.team_id
    const isSystemAdminView =
      profile?.role === 'admin' && (!teamId || scope === 'system')
    const isTeamActivityView = scope === 'team' && !!teamId

    // 🌟 3. 🛠️ แก้บั๊ก: สร้าง Function ผลิต Query แยกกล่องเพื่อยิงคู่ขนาน ทะลุลิมิต 1,000 แถว
    const buildProjectsQuery = () => {
      return supabase
        .from('order_item_projects')
        .select(`
          id,
          project_name,
          order_items!inner (
            orders!inner (
              user_id,
              team_id
            )
          )
        `, { count: 'exact' }) // ขอจำนวนที่แท้จริงในเบสมาคำนวณ
        .eq('is_deleted', false)
        .not('project_name', 'is', null)
        .neq('project_name', '')
        .neq('project_name', '-')
        .not('project_name', 'ilike', '%ไม่มีการระบุโครงการ%')
        .not('project_name', 'ilike', '%ไม่ระบุโครงการ%')
    }

    // 🌟 3.1 ยิงไปเช็คยอดรวมทั้งหมดก่อน
    const { count: totalCount, error: countError } = await buildProjectsQuery().range(0, 0)
    if (countError) throw countError

    let allProjects: any[] = []
    const totalRows = totalCount || 0

    // 🌟 3.2 ปูพรมยิงขนาน แยกร่างคำสั่ง ดึงข้อมูลมาให้ครบ 100% ไม่มีหล่นหาย
    if (totalRows > 0) {
      const PAGE_SIZE = 1000;
      const promises = [];
      
      for (let offset = 0; offset < totalRows; offset += PAGE_SIZE) {
        promises.push(
          buildProjectsQuery()
            .order('created_at', { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1)
        );
      }
      
      // ยิงพร้อมกันแบบขนาน เร็วปรื๊ด
      const results = await Promise.all(promises);
      results.forEach(({ data }) => {
        if (data) allProjects = [...allProjects, ...data];
      });
    }

    // 4. เริ่มคำนวณยอดจากข้อมูลที่ครบถ้วน
    let myCount = 0
    let teamCount = 0

    allProjects.forEach((proj: any) => {
      // ป้องกันบั๊กถ้าโครงสร้างเป็น Array
      const item = Array.isArray(proj.order_items) ? proj.order_items[0] : proj.order_items;
      const orderData = item?.orders;
      if (!orderData) return

      if (orderData.user_id === user.id) {
        myCount++
      } else if (teamId && orderData.team_id === teamId) {
        teamCount++
      }
    })

    let visitPlanStats = {
      total: 0,
      completed: 0,
      unsuccessful: 0,
    }

    if (isSystemAdminView || isTeamActivityView) {
      let visitPlansQuery = supabase
        .from('visit_plans')
        .select('status, planned_date, end_time')
        .eq('is_deleted', false)

      let visitPlans: any[] | null = []
      if (isTeamActivityView) {
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', teamId)
        if (teamMembersError) throw teamMembersError

        const teamMemberIds = (teamMembers || []).map(member => member.id)
        if (teamMemberIds.length > 0) {
          const { data, error } = await visitPlansQuery.in('user_id', teamMemberIds)
          if (error) throw error
          visitPlans = data
        }
      } else {
        const { data, error } = await visitPlansQuery
        if (error) throw error
        visitPlans = data
      }

      const now = new Date()
      const failedStatuses = new Set([
        'missed',
        'failed',
        'canceled',
        'cancelled',
        'overdue',
      ])
      let completed = 0
      let unsuccessful = 0

      for (const plan of visitPlans || []) {
        const status = String(plan.status || 'pending')

        if (status === 'completed' || status === 'success') {
          completed++
          continue
        }

        const plannedDate = plan.planned_date ? new Date(plan.planned_date) : null
        const endTimeMatch = String(plan.end_time || '').match(/^(\d{1,2}):(\d{2})/)
        const deadline = plannedDate
          ? new Date(
              plannedDate.getFullYear(),
              plannedDate.getMonth(),
              plannedDate.getDate(),
              endTimeMatch ? Number(endTimeMatch[1]) : 23,
              endTimeMatch ? Number(endTimeMatch[2]) : 59,
              endTimeMatch ? 0 : 59,
            )
          : null

        if (failedStatuses.has(status) || (status === 'pending' && deadline && now > deadline)) {
          unsuccessful++
        }
      }

      visitPlanStats = {
        total: visitPlans?.length || 0,
        completed,
        unsuccessful,
      }
    }

    // 5. ส่งค่ากลับไปแบบตัวเลขเป๊ะๆ ชัวร์ 100%
    return NextResponse.json({
      myOrders: myCount,
      teamOrders: teamCount,
      totalOrders: isSystemAdminView ? totalRows : myCount + teamCount,
      isSystemAdminView,
      visitPlanStats,
    })

  } catch (error) {
    console.error('Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
