'use server'

import { createClient } from '@supabase/supabase-js'

const CENTRAL_SUPABASE_URL =
  process.env.CENTRAL_SUPABASE_URL || 'https://gshppxgvdrmbfcxsxeph.supabase.co'
const CENTRAL_SUPABASE_ANON_KEY =
  process.env.CENTRAL_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

export type WallcraftContactFormData = {
  name: string
  email: string
  phone?: string
  message: string
}

export async function submitWallcraftContact(data: WallcraftContactFormData) {
  try {
    if (!data.name?.trim()) {
      return { success: false, error: 'กรุณากรอกชื่อผู้ติดต่อ' }
    }
    if (!data.email?.trim() && !data.phone?.trim()) {
      return { success: false, error: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์เพื่อการติดต่อกลับ' }
    }

    const nameParts = data.name.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || '-'

    const supabase = createClient(CENTRAL_SUPABASE_URL, CENTRAL_SUPABASE_ANON_KEY)

    // 1. Insert into contact_inquiries
    const { error: insertError } = await supabase
      .from('contact_inquiries')
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone: data.phone?.trim() || '',
        email: data.email.trim(),
        message: data.message?.trim() || '',
        source: 'wallcraft',
        status: 'new',
      })

    if (insertError) {
      console.error('Failed to insert contact inquiry for Wallcraft:', insertError)
      return { success: false, error: 'เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง' }
    }

    // 2. Notify ONLY Admins
    try {
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'active')

      if (adminUsers && adminUsers.length > 0) {
        const notifRows = adminUsers.map((admin: any) => ({
          user_id: admin.id,
          title: '📩 มีลูกค้าติดต่อใหม่จากเว็บ WALLCRAFT',
          body: `คุณ ${data.name.trim()} (${data.phone?.trim() || data.email.trim()}): ${
            data.message?.trim() ? data.message.trim().slice(0, 80) : 'สนใจหินวีเนียร์และผนังตกแต่ง Wallcraft'
          }`,
          type: 'inquiry',
          is_read: false,
        }))
        await supabase.from('notifications').insert(notifRows)
      }
    } catch (notifErr) {
      console.error('Error dispatching admin notifications for Wallcraft:', notifErr)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in submitWallcraftContact:', err)
    return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง' }
  }
}
