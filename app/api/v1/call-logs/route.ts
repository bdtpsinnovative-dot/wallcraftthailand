import { NextResponse } from 'next/server';
import { authenticateRequestUser, getSupabaseAdmin } from '@/app/lib/auth-helper';
import {
  cleanText,
  formatThaiPhoneDisplay,
  isMissingRelationError,
  normalizeThaiPhone,
} from '@/app/lib/customer-phone-utils';

type CallDirection = 'incoming' | 'outgoing' | 'missed';
type CallSource = 'android_call_log' | 'in_app_dial' | 'manual';
type CallOutcome = 'connected' | 'no_answer' | 'busy' | 'follow_up' | 'unknown';

const VALID_DIRECTIONS = new Set<CallDirection>(['incoming', 'outgoing', 'missed']);
const VALID_SOURCES = new Set<CallSource>(['android_call_log', 'in_app_dial', 'manual']);
const VALID_OUTCOMES = new Set<CallOutcome>([
  'connected',
  'no_answer',
  'busy',
  'follow_up',
  'unknown',
]);

interface IncomingCallLogPayload {
  phone?: string;
  contact_id?: string | null;
  contact_name?: string;
  company_name?: string;
  call_direction?: string;
  call_source?: string;
  started_at?: string;
  duration_sec?: number;
  outcome?: string;
  note?: string;
  device_call_key?: string | null;
}

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await authenticateRequestUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') === 'team' ? 'team' : 'mine';
    const phoneParam = normalizeThaiPhone(url.searchParams.get('phone'));
    const contactId = cleanText(url.searchParams.get('contact_id'), 64);
    const days = Math.min(Math.max(Number(url.searchParams.get('days') || '30') || 30, 1), 365);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '150') || 150, 1), 500);
    const sinceIso = new Date(Date.now() - days * 86400 * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('customer_call_logs')
      .select('*')
      .not('contact_id', 'is', null)
      .neq('contact_category_snapshot', 'unlisted')
      .gte('started_at', sinceIso)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (scope === 'mine') {
      query = query.eq('user_id', user.id);
    }
    if (phoneParam) {
      query = query.eq('phone_normalized', phoneParam);
    }
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    const { data: logs, error } = await query;
    if (error) {
      if (isMissingRelationError(error)) {
        return NextResponse.json({
          logs: [],
          summary: { total: 0, outgoing: 0, incoming: 0, missed: 0, totalDurationSec: 0 },
          migrationRequired: true,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(
      new Set((logs || []).map((row) => row.user_id).filter((id): id is string => Boolean(id)))
    );
    const profileMap = new Map<string, { full_name: string; email: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      for (const p of profiles || []) {
        profileMap.set(p.id, {
          full_name: cleanText(p.full_name) || cleanText(p.email) || 'พนักงาน',
          email: cleanText(p.email),
        });
      }
    }

    let outgoing = 0;
    let incoming = 0;
    let missed = 0;
    let totalDurationSec = 0;

    const enrichedLogs = (logs || []).map((row) => {
      if (row.call_direction === 'outgoing') outgoing += 1;
      else if (row.call_direction === 'incoming') incoming += 1;
      else if (row.call_direction === 'missed') missed += 1;
      totalDurationSec += Number(row.duration_sec || 0);

      const prof = row.user_id ? profileMap.get(row.user_id) : undefined;
      return {
        ...row,
        sale_name: prof?.full_name || 'พนักงาน',
      };
    });

    return NextResponse.json({
      logs: enrichedLogs,
      summary: {
        total: enrichedLogs.length,
        outgoing,
        incoming,
        missed,
        totalDurationSec,
      },
      migrationRequired: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch call logs';
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

    const rawItems: IncomingCallLogPayload[] = Array.isArray(body?.logs)
      ? body.logs.slice(0, 200)
      : [body];

    const supabase = getSupabaseAdmin();

    // Load central directory (non-ignored) to match numbers & enforce privacy on android_call_log
    const contactMap = new Map<
      string,
      {
        id: string;
        phone_display: string;
        display_name: string;
        company_name: string;
        contact_category: string;
      }
    >();
    const contactIdMap = new Map<
      string,
      {
        id: string;
        phone_normalized: string;
        phone_display: string;
        display_name: string;
        company_name: string;
        contact_category: string;
      }
    >();

    const normalizedInputs = Array.from(
      new Set(
        rawItems
          .map((item) => normalizeThaiPhone(item?.phone))
          .filter((p): p is string => Boolean(p))
      )
    );
    const contactIdInputs = Array.from(
      new Set(
        rawItems
          .map((item) => cleanText(item?.contact_id, 64))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (normalizedInputs.length > 0) {
      const { data: matchedContacts, error: matchErr } = await supabase
        .from('customer_contacts')
        .select('id, phone_normalized, phone_display, display_name, company_name, contact_category, review_status')
        .in('phone_normalized', normalizedInputs)
        .neq('review_status', 'ignored');

      if (matchErr) {
        if (isMissingRelationError(matchErr)) {
          return NextResponse.json(
            { error: 'ตาราง customer_contacts ยังไม่ถูกสร้าง', migrationRequired: true },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: matchErr.message }, { status: 500 });
      }

      for (const c of matchedContacts || []) {
        contactMap.set(c.phone_normalized, c);
        contactIdMap.set(c.id, c);
      }
    }

    const missingContactIds = contactIdInputs.filter((id) => !contactIdMap.has(id));
    if (missingContactIds.length > 0) {
      const { data: matchedById, error: matchByIdErr } = await supabase
        .from('customer_contacts')
        .select('id, phone_normalized, phone_display, display_name, company_name, contact_category, review_status')
        .in('id', missingContactIds)
        .neq('review_status', 'ignored');

      if (matchByIdErr && !isMissingRelationError(matchByIdErr)) {
        return NextResponse.json({ error: matchByIdErr.message }, { status: 500 });
      }

      for (const c of matchedById || []) {
        if (c.phone_normalized) contactMap.set(c.phone_normalized, c);
        contactIdMap.set(c.id, c);
      }
    }

    const rowsWithKey: Array<Record<string, unknown>> = [];
    const rowsWithoutKey: Array<Record<string, unknown>> = [];
    let unmatchedCount = 0;

    for (const item of rawItems) {
      const normalized = normalizeThaiPhone(item?.phone);
      if (!normalized) continue;

      const callSource: CallSource = VALID_SOURCES.has(item?.call_source as CallSource)
        ? (item.call_source as CallSource)
        : 'manual';

      const matched =
        contactMap.get(normalized) ||
        (item?.contact_id ? contactIdMap.get(String(item.contact_id)) : undefined);

      // Strictly ignore numbers outside our central directory (customer_contacts)
      if (!matched) {
        unmatchedCount += 1;
        continue;
      }

      const direction: CallDirection = VALID_DIRECTIONS.has(item?.call_direction as CallDirection)
        ? (item.call_direction as CallDirection)
        : 'outgoing';

      const durationSec = Math.max(0, Math.trunc(Number(item?.duration_sec || 0) || 0));

      let outcome: CallOutcome = VALID_OUTCOMES.has(item?.outcome as CallOutcome)
        ? (item.outcome as CallOutcome)
        : direction === 'missed' || durationSec === 0
          ? 'no_answer'
          : 'connected';

      if (callSource === 'android_call_log' && !item?.outcome) {
        outcome = direction === 'missed' || durationSec === 0 ? 'no_answer' : 'connected';
      }

      const parsedDate = item?.started_at ? new Date(item.started_at) : new Date();
      const startedAt = Number.isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();

      const deviceCallKey = cleanText(item?.device_call_key, 120) || null;
      const payload = {
        user_id: user.id,
        contact_id: matched.id,
        phone_normalized: normalized,
        phone_display: matched.phone_display || formatThaiPhoneDisplay(normalized),
        contact_name_snapshot: matched.display_name || cleanText(item?.contact_name, 140) || '',
        company_name_snapshot: matched.company_name || cleanText(item?.company_name, 140) || '',
        contact_category_snapshot: matched.contact_category || 'general',
        call_direction: direction,
        call_source: callSource,
        started_at: startedAt,
        duration_sec: durationSec,
        outcome,
        note: cleanText(item?.note, 500),
        device_call_key: deviceCallKey,
      };

      if (deviceCallKey) rowsWithKey.push(payload);
      else rowsWithoutKey.push(payload);
    }

    let insertedCount = 0;
    const savedRows: Array<Record<string, unknown>> = [];

    if (rowsWithKey.length > 0) {
      const { data: upserted, error: upsertErr } = await supabase
        .from('customer_call_logs')
        .upsert(rowsWithKey, {
          onConflict: 'user_id,device_call_key',
          ignoreDuplicates: true,
        })
        .select('*');

      if (upsertErr) {
        if (isMissingRelationError(upsertErr)) {
          return NextResponse.json(
            {
              error: 'ยังไม่ได้สร้างตาราง customer_call_logs ใน Supabase',
              migrationRequired: true,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
      insertedCount += (upserted || []).length;
      savedRows.push(...(upserted || []));
    }

    if (rowsWithoutKey.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('customer_call_logs')
        .insert(rowsWithoutKey)
        .select('*');

      if (insertErr) {
        if (isMissingRelationError(insertErr)) {
          return NextResponse.json(
            {
              error: 'ยังไม่ได้สร้างตาราง customer_call_logs ใน Supabase',
              migrationRequired: true,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      insertedCount += (inserted || []).length;
      savedRows.push(...(inserted || []));
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      unmatchedCount,
      logs: savedRows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save call log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { user, error: authError } = await authenticateRequestUser(
      request,
      typeof body?.token === 'string' ? body.token : null
    );
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = cleanText(body?.id, 64);
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body?.note === 'string') {
      updates.note = cleanText(body.note, 500);
    }
    if (typeof body?.outcome === 'string' && VALID_OUTCOMES.has(body.outcome as CallOutcome)) {
      updates.outcome = body.outcome;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('customer_call_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update call log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
