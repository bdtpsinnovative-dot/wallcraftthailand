import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

    // Check if requester is admin
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (requesterProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('full_name', { ascending: true });

    if (error) throw error;

    const orderCounts: Record<string, number> = {};
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data: orderRows, error: ordersError } = await supabase
        .from('orders')
        .select('user_id')
        .not('user_id', 'is', null)
        .range(offset, offset + pageSize - 1);
      if (ordersError) throw ordersError;

      for (const order of orderRows || []) {
        if (order.user_id) orderCounts[order.user_id] = (orderCounts[order.user_id] || 0) + 1;
      }
      if (!orderRows || orderRows.length < pageSize) break;
    }

    const sortedUsers = (users || [])
      .map(userProfile => ({
        ...userProfile,
        order_count: orderCounts[userProfile.id] || 0,
      }))
      .sort((userA, userB) => {
        const countDifference = userB.order_count - userA.order_count;
        if (countDifference !== 0) return countDifference;
        return (userA.full_name || '').localeCompare(userB.full_name || '', 'th');
      });

    return NextResponse.json({ users: sortedUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
