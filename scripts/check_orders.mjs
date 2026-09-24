import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envContent = fs.readFileSync('c:/Users/Por Woodden/Desktop/the_best/wallcraft-next/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('Querying latest 5 orders...');
  const { data: orders, error: errOrders } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, company_id, customer_type_id, companies(name, customer_types(name)), customer_types(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (errOrders) console.error('Orders error:', errOrders);
  else console.log('Latest orders:', JSON.stringify(orders, null, 2));

  console.log('\nQuerying company FAY arteriors...');
  const { data: comp, error: errComp } = await supabase
    .from('companies')
    .select('id, name, customer_type_id, customer_types(name)')
    .ilike('name', '%FAY%');
  
  if (errComp) console.error('Comp error:', errComp);
  else console.log('Company:', JSON.stringify(comp, null, 2));

  console.log('\nQuerying latest order_item_projects...');
  const { data: oip, error: errOip } = await supabase
    .from('order_item_projects')
    .select('id, project_name, area_sqm, account_developer, account_architecture, account_interior, account_contractor, created_at, is_deleted')
    .order('created_at', { ascending: false })
    .limit(5);

  if (errOip) console.error('OIP error:', errOip);
  else console.log('Latest OIP:', JSON.stringify(oip, null, 2));
}

check();
