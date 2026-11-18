import { NextResponse } from 'next/server';
import { authenticateRequestUser, getSupabaseAdmin } from '@/app/lib/auth-helper';
import {
  cleanText,
  formatThaiPhoneDisplay,
  isMissingRelationError,
  normalizeThaiPhone,
} from '@/app/lib/customer-phone-utils';

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await authenticateRequestUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = cleanText(url.searchParams.get('q'), 80).toLowerCase();
    const updatedAfter = cleanText(url.searchParams.get('updated_after'), 40);

    const supabase = getSupabaseAdmin();
    const pageSize = 1000;
    let from = 0;
    const allContacts: Array<Record<string, unknown>> = [];

    while (true) {
      let query = supabase
        .from('customer_contacts')
        .select(
          'id, phone_normalized, phone_display, display_name, company_name, contact_category, project_names, owner_sale_name, notes, order_count, last_order_at, updated_at'
        )
        .eq('review_status', 'verified')
        .order('order_count', { ascending: false })
        .order('display_name', { ascending: true })
        .range(from, from + pageSize - 1);

      if (updatedAfter) {
        query = query.gt('updated_at', updatedAfter);
      }

      const { data, error } = await query;
      if (error) {
        if (isMissingRelationError(error)) {
          return NextResponse.json({
            contacts: [],
            count: 0,
            latestUpdatedAt: null,
            migrationRequired: true,
          });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) break;
      allContacts.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const filtered = search
      ? allContacts.filter((c) => {
          const hay = [
            c.phone_normalized,
            c.phone_display,
            c.display_name,
            c.company_name,
            c.owner_sale_name,
            ...(Array.isArray(c.project_names) ? c.project_names : []),
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(search);
        })
      : allContacts;

    let latestUpdatedAt: string | null = null;
    for (const c of allContacts) {
      const ts = typeof c.updated_at === 'string' ? c.updated_at : null;
      if (ts && (!latestUpdatedAt || ts > latestUpdatedAt)) {
        latestUpdatedAt = ts;
      }
    }

    return NextResponse.json({
      contacts: filtered,
      count: filtered.length,
      latestUpdatedAt,
      migrationRequired: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load customer contacts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, error: authError } = await authenticateRequestUser(
      request,
      typeof body?.token === 'string' ? body.token : null
    );
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawPhone = cleanText(body?.phone, 40);
    const normalized = normalizeThaiPhone(rawPhone);
    if (!normalized) {
      return NextResponse.json(
        { error: 'กรุณาระบุเบอร์โทรไทย 9-10 หลักให้ถูกต้อง' },
        { status: 400 }
      );
    }

    const displayName = cleanText(body?.display_name, 120);
    if (!displayName) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อลูกค้า / ผู้ติดต่อ' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if phone already exists
    const { data: existing, error: existingErr } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('phone_normalized', normalized)
      .maybeSingle();

    if (existingErr) {
      if (isMissingRelationError(existingErr)) {
        return NextResponse.json(
          { error: 'ตาราง customer_contacts ยังไม่ถูกสร้าง', migrationRequired: true },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        contact: existing,
        message: 'เบอร์นี้มีอยู่ในสมุดเบอร์กลางแล้ว',
      });
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const saleName = cleanText(prof?.full_name) || cleanText(prof?.email) || '';
    const phoneDisplay = formatThaiPhoneDisplay(normalized);
    const companyName = cleanText(body?.company_name, 140);
    const category = cleanText(body?.contact_category, 40).toLowerCase() || 'general';
    const notes = cleanText(body?.notes, 500);

    const { data: inserted, error: insertErr } = await supabase
      .from('customer_contacts')
      .insert({
        phone_normalized: normalized,
        phone_display: phoneDisplay,
        display_name: displayName,
        contact_category: category,
        company_name: companyName,
        alternate_names: [displayName],
        raw_phones: [rawPhone || phoneDisplay],
        source_tables: ['mobile_app'],
        owner_sale_id: user.id,
        owner_sale_name: saleName,
        order_count: 0,
        review_status: 'pending_review',
        manually_edited: false,
        notes,
      })
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      contact: inserted,
      message: 'บันทึกเบอร์ใหม่ส่งให้แอดมินตรวจสอบเรียบร้อยแล้ว',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create contact';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
