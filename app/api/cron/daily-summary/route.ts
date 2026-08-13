import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// ==================================================
// 🔔 1. เตรียมใช้งาน Firebase Admin
// ==================================================
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        }),
      });
      console.log('✅ Firebase Admin Initialized Successfully!');
    }
  } catch (error) {
    console.error('❌ Firebase admin initialization error:', error);
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function extractFcmTokens(rawTokens: any): string[] {
  if (!Array.isArray(rawTokens)) return [];
  return rawTokens
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'token' in entry) {
        const token = (entry as { token?: unknown }).token;
        return typeof token === 'string' ? token : null;
      }
      return null;
    })
    .filter((token): token is string => Boolean(token));
}

export async function GET(request: Request) {
  try {
    // Check Cron Secret if needed (Vercel sets Authorization: Bearer CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // Start of today (assuming server is somewhat aligned with local time, or use UTC offsets)
    // Vercel Edge functions run in UTC. If the users are in Thailand (UTC+7),
    // 01:00 AM BKK is 18:00 UTC (previous day).
    // Thailand offset is +7 hours.
    const thailandTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    // Get YYYY-MM-DD in Thailand time
    const todayDateString = thailandTime.toISOString().split('T')[0];

    // Calculate start of current week (Monday) in Thailand time
    const dayOfWeek = thailandTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(thailandTime.getTime());
    currentWeekStart.setDate(thailandTime.getDate() - diffToMonday);
    const currentWeekStartString = currentWeekStart.toISOString().split('T')[0];

    console.log(`Cron running at ${now.toISOString()}. Today in TH is ${todayDateString}. Week start is ${currentWeekStartString}`);

    // ==============================================================
    // 1. ค้นหาและเปลี่ยนสถานะงานที่เลยกำหนด (Missed) 
    // ==============================================================
    const { data: overduePlans, error: overdueError } = await supabase
      .from('visit_plans')
      .update({ status: 'cancelled' })
      .lt('planned_date', currentWeekStartString)
      .eq('status', 'pending')
      .select('id, user_id');

    if (overdueError) throw overdueError;

    // Group overdue plans by user
    const missedByUser: Record<string, number> = {};
    if (overduePlans) {
      for (const plan of overduePlans) {
        if (!plan.user_id) continue;
        missedByUser[plan.user_id] = (missedByUser[plan.user_id] || 0) + 1;
      }
    }

    // ==============================================================
    // 2. ค้นหางานของวันนี้ (Today)
    // ==============================================================
    const { data: todayPlans, error: todayError } = await supabase
      .from('visit_plans')
      .select('id, user_id')
      .eq('planned_date', todayDateString)
      .eq('status', 'pending');

    if (todayError) throw todayError;

    // Group today plans by user
    const todayByUser: Record<string, number> = {};
    if (todayPlans) {
      for (const plan of todayPlans) {
        if (!plan.user_id) continue;
        todayByUser[plan.user_id] = (todayByUser[plan.user_id] || 0) + 1;
      }
    }

    // ==============================================================
    // 3. ดึง FCM Tokens และส่งแจ้งเตือน
    // ==============================================================
    // Only fetch users who have missed plans or today plans
    const userIds = new Set([...Object.keys(missedByUser), ...Object.keys(todayByUser)]);
    if (userIds.size === 0) {
      return NextResponse.json({ success: true, message: 'No plans to report.' });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, fcm_tokens')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    const messagesToSend: any[] = [];
    const notificationPayloads: any[] = [];

    for (const profile of profiles || []) {
      const missedCount = missedByUser[profile.id] || 0;
      const todayCount = todayByUser[profile.id] || 0;
      
      let body = '';
      if (missedCount > 0 && todayCount > 0) {
        body = `มีงานไม่สำเร็จเมื่อวาน ${missedCount} รายการ\nวันนี้คุณมีคิวเข้าพบลูกค้า ${todayCount} รายการ`;
      } else if (missedCount > 0) {
        body = `มีงานไม่สำเร็จเมื่อวาน ${missedCount} รายการ ระบบอัปเดตสถานะแล้ว`;
      } else if (todayCount > 0) {
        body = `วันนี้คุณมีคิวเข้าพบลูกค้า ${todayCount} รายการ เตรียมตัวให้พร้อม!`;
      }

      if (!body) continue;

      const title = 'สรุปแผนงานประจำวัน';

      notificationPayloads.push({
        recipient_id: profile.id,
        creator_id: profile.id,
        title: title,
        body: body,
      });

      const tokens = extractFcmTokens(profile.fcm_tokens);
      if (tokens.length > 0) {
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

    // Insert to notifications table
    if (notificationPayloads.length > 0) {
      const { error: dbError } = await supabase.from('notifications').insert(notificationPayloads);
      if (dbError) console.error("[Cron] Error saving notifications to DB:", dbError);
    }

    // Send FCM push notifications
    let successCount = 0;
    let failureCount = 0;
    let fcmErrors: any[] = [];
    
    for (const msg of messagesToSend) {
      try {
        const response = await admin.messaging().sendEachForMulticast(msg);
        successCount += response.successCount;
        failureCount += response.failureCount;
        
        if (response.failureCount > 0) {
          response.responses.forEach((res, idx) => {
            if (!res.success) {
              fcmErrors.push({ tokenIndex: idx, error: res.error?.message });
            }
          });
        }
      } catch (err: any) {
        console.error('[Cron] FCM Error:', err);
        fcmErrors.push({ error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      missed_updated: overduePlans?.length || 0,
      today_plans: todayPlans?.length || 0,
      notifications_sent: successCount,
      notifications_failed: failureCount,
      fcm_errors: fcmErrors
    });

  } catch (err: any) {
    console.error('[Cron] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
