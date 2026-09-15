// app/api/v1/orders/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ==================================================
// ☁️ Cloudflare R2 Client Initialization
// ==================================================
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// ==================================================
// 🔔 1. เตรียมใช้งาน Firebase Admin (ทำแค่ครั้งเดียว)
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
    } else {
      console.warn('⚠️ Missing Firebase Environment Variables.');
    }
  } catch (error) {
    console.error('❌ Firebase admin initialization error:', error);
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // 🟢 1. เพิ่มการ Query 'project_types' เข้าไปใน Promise.all
    const [customerTypes, productCategories, projects, projectTypes] = await Promise.all([
      supabase.from('customer_types').select('*').order('created_at'),
      supabase.from('product_categories').select('*').order('created_at'),
      supabase.from('projects').select('*').order('created_at'),
      supabase.from('project_types').select('*').order('id'),
    ]);

    return NextResponse.json({
      customer_types: customerTypes.data || [],
      product_categories: productCategories.data || [],
      projects: projects.data || [],
      project_types: projectTypes.data || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      token, user_id, customer_type_id, company_id, company_name,
      customer_name, phone, items, audit_log 
    } = body;

    let currentUserId = user_id;

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) currentUserId = user.id;
    }

    let effectiveCompanyId = company_id;

    // 🛡️ หากไม่ได้ส่ง company_id มา ให้ลองค้นหาจากชื่อในฐานข้อมูล
    if (!effectiveCompanyId && typeof company_name === 'string' && company_name.trim()) {
      const { data: matchedComp } = await supabase
        .from('companies')
        .select('id, name, customer_type_id')
        .ilike('name', company_name.trim())
        .limit(1)
        .maybeSingle();

      if (matchedComp) {
        effectiveCompanyId = matchedComp.id;
      }
    }

    // 🛡️ หากยังไม่มี company_id: ลองตรวจว่า customer_name เป็นชื่อบริษัทตรงๆ หรือไม่
    if (!effectiveCompanyId && typeof customer_name === 'string' && customer_name.trim()) {
      const { data: matchedCompByName } = await supabase
        .from('companies')
        .select('id, name, customer_type_id')
        .ilike('name', customer_name.trim())
        .limit(1)
        .maybeSingle();

      if (matchedCompByName) {
        effectiveCompanyId = matchedCompByName.id;
      }
    }

    // 🛡️ หากยังไม่มี company_id: ตรวจสอบจากประวัติเช็คอินของทีมในวันเดียวกันที่มี customer_name เดียวกัน (เช่น คุณหนอ -> IA103)
    if (!effectiveCompanyId && typeof customer_name === 'string' && customer_name.trim()) {
      const todayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSameCustomer } = await supabase
        .from('orders')
        .select('company_id')
        .not('company_id', 'is', null)
        .ilike('customer_name', customer_name.trim())
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentSameCustomer?.company_id) {
        effectiveCompanyId = recentSameCustomer.company_id;
      }
    }

    let team_id = null;
    let companyName: string | null = null;
    let typeName = '';

    const [profileRes, companyRes, typeRes] = await Promise.all([
      currentUserId ? supabase.from('profiles').select('team_id, full_name').eq('id', currentUserId).maybeSingle() : Promise.resolve({ data: null }),
      effectiveCompanyId ? supabase.from('companies').select('id, name, customer_type_id, customer_types(name)').eq('id', effectiveCompanyId).maybeSingle() : Promise.resolve({ data: null }),
      customer_type_id ? supabase.from('customer_types').select('name').eq('id', customer_type_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    team_id = profileRes.data?.team_id;
    companyName = companyRes.data?.name || (typeof company_name === 'string' && company_name.trim() ? company_name.trim() : null);

    // 🌟 หากเซลส์ไม่ได้เลือกประเภทลูกค้า (หรือบริษัทไม่มีประเภทลูกค้า) ให้ Fallback ใช้ประเภทลูกค้าจากตาราง companies
    const effectiveCustomerTypeId = customer_type_id || companyRes.data?.customer_type_id || null;
    const companyCustomerTypeName = (companyRes.data?.customer_types as any)?.name || '';
    typeName = typeRes.data?.name || companyCustomerTypeName || '';
    const creatorName = profileRes.data?.full_name || 'เพื่อนร่วมทีม'; 

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // 🛡️ ป้องกันการบันทึกข้อมูลซ้ำซ้อนจากฝั่ง API (Double Submit / Rate Limit)
    if (currentUserId) {
      const duplicateCheckWindow = new Date(Date.now() - 120000).toISOString(); // ย้อนหลัง 2 นาที
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id, 
          customer_name, 
          phone, 
          company_id,
          order_items (
            product_category_id,
            note
          )
        `)
        .eq('user_id', currentUserId)
        .gt('created_at', duplicateCheckWindow)
        .order('created_at', { ascending: false });

      if (recentOrders && recentOrders.length > 0) {
        const lastOrder = recentOrders[0];

        const lastOrderItemsKey = Array.isArray(lastOrder.order_items)
          ? lastOrder.order_items
              .map((item: any) => `${item.product_category_id || ''}:${String(item.note || '').trim()}`)
              .sort()
              .join('|')
          : '';
        const incomingItemsKey = Array.isArray(items)
          ? items
              .map((item: any) => `${item.product_category_id || ''}:${String(item.note || '').trim()}`)
              .sort()
              .join('|')
          : '';

        if (
          String(lastOrder.customer_name || '') === String(customer_name || '') &&
          String(lastOrder.phone || '') === String(phone || '') &&
          String(lastOrder.company_id || '') === String(effectiveCompanyId || '') &&
          lastOrderItemsKey === incomingItemsKey
        ) {
          console.warn(`[API] ตรวจพบการบันทึก Order ซ้ำซ้อนจาก User: ${currentUserId} ภายใน 2 นาที ระบบจะนำข้อมูลเดิมไปตอบกลับ`);
          return NextResponse.json({ success: true, orderId: lastOrder.id });
        }
      }
    }

    // 📝 1. บันทึก Order หลัก
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: currentUserId || null,
        team_id: team_id || null, 
        company_id: effectiveCompanyId || null,
        customer_type_id: effectiveCustomerTypeId || null,
        customer_name: customer_name || null,
        phone: phone || null,
        audit_log: audit_log ? { ...audit_log, network: { ip: ip } } : null
      })
      .select().single();

    if (orderError) throw orderError;
    
    // 📦 2. ตรวจสอบและอัปโหลดรูปภาพลง Cloudflare R2
    let orderItemsToProcess = items && Array.isArray(items) && items.length > 0 ? items : [{}];

    const { data: allProjects } = await supabase.from('projects').select('id, project_name');
    const projectMap = new Map(allProjects?.map(p => [p.id, p.project_name]) || []);

    for (const item of orderItemsToProcess) {
      let itemImageUrls: string[] = [];
      if (item.images && Array.isArray(item.images)) {
        for (let i = 0; i < item.images.length; i++) {
          try {
            const buffer = Buffer.from(item.images[i], 'base64');
            const key = `orders/order_${order.id}_${Date.now()}_${i}.webp`;
            
            await r2Client.send(new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME || 'wallcraft',
              Key: key,
              Body: buffer,
              ContentType: 'image/webp',
            }));

            const baseUrl = (process.env.R2_PUBLIC_URL || 'https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev').replace(/\/$/, '');
            const publicUrl = `${baseUrl}/${key}`;
            itemImageUrls.push(publicUrl);
          } catch (e) {
            console.error("Cloudflare R2 Upload Error:", e);
          }
        }
      }

      const { data: savedItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_category_id: item.product_category_id || null,
          interest_level: item.interest_level || null, 
          note: item.note || null,
          images: itemImageUrls 
        })
        .select().single();

      if (itemError) continue;

      let projectUsagePayload = [];
      const hasProjectUsage = item.project_usage && Array.isArray(item.project_usage) && item.project_usage.length > 0;

      if (hasProjectUsage) {
        projectUsagePayload = item.project_usage.map((usage: any) => {
          const pName = projectMap.get(usage.project_id) || '-';
          const projectYear = Number.parseInt(String(usage.project_year ?? '').trim(), 10);
          let projectRow: any = {
            order_item_id: savedItem.id,
            project_name: pName,
            area_sqm: usage.area_sqm ? parseFloat(usage.area_sqm) : 0,
            project_type_id: usage.project_type_id || item.project_type_id || null,
            queue_level: usage.queue_level || null,
            project_year: Number.isFinite(projectYear) ? projectYear : null,
          };
          return injectCompanyNames(projectRow, typeName, companyName);
        });
      } else {
        const fallbackProjectYear = Number.parseInt(String(item.project_year ?? '').trim(), 10);
        let fallbackProjectRow: any = {
            order_item_id: savedItem.id,
            project_name: 'ไม่มีการระบุโครงการ',
            area_sqm: 0,
            project_type_id: item.project_type_id || null,
            queue_level: item.queue_level || null,
            project_year: Number.isFinite(fallbackProjectYear) ? fallbackProjectYear : null,
        };
        projectUsagePayload.push(injectCompanyNames(fallbackProjectRow, typeName, companyName));
      }

      await supabase.from('order_item_projects').insert(projectUsagePayload);
    }

    // ==================================================
    // 📅 4. อัปเดตแผนการเข้าพบ (Visit Plans) ของสัปดาห์นี้เป็น 'completed' อัตโนมัติ
    // ==================================================
    if (currentUserId && company_id) {
      try {
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
        
        const startOfWeek = new Date(new Date().setDate(diffToMonday));
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // หาแผนการเข้าพบที่ค้างอยู่ในสัปดาห์นี้สำหรับบริษัทนี้
        const { data: pendingPlans } = await supabase
          .from('visit_plans')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('company_id', company_id)
          .eq('status', 'pending')
          .eq('is_deleted', false)
          .gte('planned_date', startOfWeek.toISOString())
          .lte('planned_date', endOfWeek.toISOString());

        if (pendingPlans && pendingPlans.length > 0) {
          const planIds = pendingPlans.map(p => p.id);
          await supabase
            .from('visit_plans')
            .update({ status: 'completed' })
            .in('id', planIds);
          console.log(`[VisitPlan] Marked visit plans ${planIds.join(', ')} as completed for company ${company_id}`);
        }
      } catch (vpErr) {
        console.error("[VisitPlan] Error completing visit plan:", vpErr);
      }
    }

    // ==================================================
    // 🔔 5. สร้างประวัติแจ้งเตือนลง DB + ยิง FCM แบบแยกเงื่อนไข
    // ==================================================
    try {
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, fcm_tokens, team_id, noti_level, is_muted');

      if (allUsers && allUsers.length > 0) {
        const recipients = allUsers.filter(member => {
          if (member.id === currentUserId) return false; // ไม่แจ้งเตือนคนสร้างออเดอร์เอง
          if (member.noti_level === 'none') return false; 
          if (member.noti_level === 'all') return true;  
          if (member.noti_level === 'team' && member.team_id === team_id) return true; 
          return false;
        });

        if (recipients.length > 0) {
          const customerDisplay = companyName || customer_name || 'ลูกค้าทั่วไป';

          const notifTitle = `Visit : ${customerDisplay}`;
          const projectNames = (Array.isArray(items) ? items : [])
            .flatMap((item: any) => Array.isArray(item.project_usage) ? item.project_usage : [])
            .map((usage: any) => usage.project_id ? projectMap.get(usage.project_id) : null)
            .filter((name): name is string => typeof name === 'string' && name.trim() !== '');

          // หนึ่งโครงการลูก = หนึ่งแจ้งเตือน และใช้ชื่อของโครงการลูกตัวนั้นโดยตรง
          const notificationBodies = projectNames.length > 0
            ? projectNames.map(projectName => `ได้รับโครงการ : ${projectName}\nเซลส์ : ${creatorName}`)
            : [`เซลส์ : ${creatorName}`];

          const notificationPayloads = recipients.flatMap(member =>
            notificationBodies.map(notifBody => ({
              recipient_id: member.id,
              creator_id: currentUserId,
              title: notifTitle,
              body: notifBody,
              order_id: order.id
            }))
          );

          const { error: dbError } = await supabase.from('notifications').insert(notificationPayloads);
          if (dbError) console.error("[DB] Error saving notification history:", dbError);

          for (const target of recipients) {
            const tokens = extractFcmTokens(target.fcm_tokens);
            if (tokens.length === 0) continue;

            for (const notifBody of notificationBodies) {
              try {
                const messagePayload: admin.messaging.MulticastMessage = {
                  tokens,
                  notification: {
                    title: notifTitle,
                    body: notifBody,
                  },
                  data: {
                    orderId: order.id.toString(),
                    type: 'new_order'
                  },
                  android: {
                    priority: 'high',
                    notification: {
                      clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                      ...(!target.is_muted ? { sound: 'default' } : {})
                    }
                  },
                  apns: {
                    payload: {
                      aps: {
                        badge: 1,
                        ...(!target.is_muted ? { sound: 'default' } : {})
                      }
                    }
                  }
                };

                const fcmResponse = await admin.messaging().sendEachForMulticast(messagePayload);
                if (fcmResponse.failureCount > 0) {
                  const failedTokens = fcmResponse.responses
                    .map((resp, index) => resp.success ? null : tokens[index])
                    .filter((token): token is string => Boolean(token));
                  console.error(`[FCM] Failed tokens for ${target.id}:`, failedTokens);

                  const { error: dbError } = await supabase.rpc('remove_invalid_fcm_tokens', {
                    invalid_tokens: failedTokens
                  });
                  if (dbError) {
                    console.error("❌ [FCM] ลบ Dead Tokens ไม่สำเร็จ:", dbError);
                  } else {
                    console.log("✅ [FCM] ลบ Dead Tokens เรียบร้อยแล้ว:", failedTokens);
                  }
                }
              } catch (fcmErr) {
                console.error(`[FCM] Failed to send to ${target.id}:`, fcmErr);
              }
            }
          }
          console.log(`[FCM] ดำเนินการส่งแจ้งเตือนให้ผู้รับทั้งหมด ${recipients.length} คนเรียบร้อยครับนาย!`);
        }
      }
    } catch (err) {
      console.error('[FCM] Error process notifications:', err);
    }

    return NextResponse.json({ success: true, orderId: order.id });

  } catch (err: any) {
    console.error("API POST Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function injectCompanyNames(projectRow: any, typeName: string, companyName: string | null) {
  const typeStr = (typeName || '').toLowerCase();
  if (typeStr.includes('developer')) projectRow.account_developer = companyName;
  else if (typeStr.includes('architect')) projectRow.account_architecture = companyName;
  else if (typeStr.includes('interior')) projectRow.account_interior = companyName;
  else if (typeStr.includes('contractor') || typeStr.includes('turnkey') || typeStr.includes('builder')) {
    projectRow.account_contractor = companyName; 
  } else if (companyName) {
    // 🌟 Fallback สำหรับกรณีไม่มีประเภทลูกค้า หรือเป็นประเภทอื่น (เช่น Office)
    // เพื่อให้ชื่อบริษัทถูกเก็บลงในโปรเจกต์เสมอ ไม่หลุดหายจากการ์ด Pool Project
    projectRow.account_developer = companyName;
  }
  return projectRow;
}

function extractFcmTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
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
