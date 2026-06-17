import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    // 1. ตรวจสอบ Token
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. หา Team ID ของ User
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single()

    const teamId = profile?.team_id

    // 🌟 3. 🛠️ แก้บั๊ก: สร้าง Function ผลิต Query แยกกล่องเพื่อยิงคู่ขนาน ทะลุลิมิต 1,000 แถว
    const buildProjectsQuery = () => {
      return supabase
        .from('order_item_projects')
        .select(`
          id,
          order_items!inner (
            orders!inner (
              user_id,
              team_id
            )
          )
        `, { count: 'exact' }) // ขอจำนวนที่แท้จริงในเบสมาคำนวณ
        .eq('is_deleted', false)
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

    // 5. ส่งค่ากลับไปแบบตัวเลขเป๊ะๆ ชัวร์ 100%
    return NextResponse.json({
      myOrders: myCount,
      teamOrders: teamCount,
      totalOrders: myCount + teamCount
    })

  } catch (error) {
    console.error('Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}