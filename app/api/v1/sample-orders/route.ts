import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const body = await request.json();
    const { company_id, project_id, note, product_name, color, series, film, qty } = body;

    if (!company_id || !project_id || !product_name || !color || !series || !film || !qty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: orderData, error: orderError } = await supabase
      .from('sample_orders')
      .insert([
        { 
          company_id, 
          project_id, 
          user_id: null, 
          note, 
          status: 'pending'
        }
      ])
      .select('id')
      .single();

    if (orderError || !orderData) {
      throw orderError || new Error('Failed to create sample order');
    }

    const sampleOrderId = orderData.id;

    const { error: itemError } = await supabase
      .from('sample_order_items')
      .insert([
        {
          sample_order_id: sampleOrderId,
          product_name,
          color,
          series,
          film,
          qty: parseInt(qty.toString(), 10) || 1
        }
      ]);

    if (itemError) {
      throw itemError;
    }

    return NextResponse.json(
      { success: true, message: 'Sample order created successfully', id: sampleOrderId }, 
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating sample order:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data, error } = await supabase
      .from('sample_orders')
      .select(`
        id,
        status,
        note,
        created_at,
        companies:company_id ( id, name ),
        projects:project_id ( id, project_name ),
        sample_order_items ( id, product_name, color, series, film, qty )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching sample orders:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('sample_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
