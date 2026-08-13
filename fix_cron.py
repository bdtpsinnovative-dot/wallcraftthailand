# -*- coding: utf-8 -*-
import sys
file_path = r'C:\Users\Por Woodden\Desktop\the_best\wallcraft-next\app\api\cron\daily-summary\route.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''    // ==============================================================
    // 3. ดึง FCM Tokens และส่งแจ้งเตือน
    // ==============================================================
    // Only fetch users who have missed plans, today plans, or overdue this week plans
    const userIds = new Set([
      ...Object.keys(missedByUser), 
      ...Object.keys(todayByUser),
      ...Object.keys(overdueThisWeekByUser)
    ]);
    if (userIds.size === 0) {
      return NextResponse.json({ success: true, message: 'No plans to report.' });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, fcm_tokens')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    const messagesToSend: any[] = [];
    const notificationPayloads: any[] = [];'''

new_block = '''    // ==============================================================
    // 3. ดึง FCM Tokens และส่งแจ้งเตือน
    // ==============================================================
    const messagesToSend: any[] = [];
    const notificationPayloads: any[] = [];

    // แจ้งเตือนแอดมินถ้ามีงานที่ไม่สำเร็จเมื่อจบสัปดาห์
    if (overduePlans && overduePlans.length > 0) {
      const { data: admins } = await supabase.from('profiles').select('id, fcm_tokens').eq('role', 'admin');
      if (admins) {
        for (const adminUser of admins) {
          const title = 'แจ้งเตือนงานค้างสัปดาห์ก่อน (แอดมิน)';
          const body = สัปดาห์ที่ผ่านมา มีแผนงานที่ไม่สำเร็จและถูกยกเลิกอัตโนมัติรวม \ รายการ กรุณาตรวจสอบในระบบ;
          
          notificationPayloads.push({
            recipient_id: adminUser.id,
            creator_id: adminUser.id, // system alert
            title: title,
            body: body,
          });
          
          const tokens = extractFcmTokens(adminUser.fcm_tokens);
          if (tokens.length > 0) {
            messagesToSend.push({
              tokens,
              notification: { title, body },
              android: { priority: 'high', notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK', sound: 'default' } },
              apns: { payload: { aps: { sound: 'default' } } }
            });
          }
        }
      }
    }

    // Only fetch users who have missed plans, today plans, or overdue this week plans
    const userIds = new Set([
      ...Object.keys(missedByUser), 
      ...Object.keys(todayByUser),
      ...Object.keys(overdueThisWeekByUser)
    ]);
    
    if (userIds.size > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, fcm_tokens')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;'''

content = content.replace(old_block, new_block)

# We need to close the if (userIds.size > 0) { block around the user loop.
old_loop_block = '''      if (tokens.length > 0) {
        messagesToSend.push({
          tokens,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: { sound: 'default' }
            }
          }
        });
      }
    }

    // Insert to notifications table'''

new_loop_block = '''      if (tokens.length > 0) {
        messagesToSend.push({
          tokens,
          notification: { title, body },
          android: {
            priority: 'high',
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: { sound: 'default' }
            }
          }
        });
      }
    }
    }

    // Insert to notifications table'''

content = content.replace(old_loop_block, new_loop_block)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated route.ts')
