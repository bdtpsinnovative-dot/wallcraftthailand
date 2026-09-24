import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, company_id, companies(name), order_items(id, note, order_item_projects(*))')
    .eq('user_id', 'f67cf515-a6fc-4351-8373-eccec4b91c4b')
    .gte('created_at', '2026-09-23T00:00:00Z')
    .lte('created_at', '2026-09-23T23:59:59Z')
    .order('created_at', { ascending: false });

  console.log('Orders on 23/09 by Natthaya:', JSON.stringify(orders, null, 2));
}

run();
