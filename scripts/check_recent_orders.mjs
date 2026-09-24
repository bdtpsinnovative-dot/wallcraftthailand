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

async function check() {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, company_id, customer_type_id, user_id, profiles(full_name), companies(name), order_items(id, order_item_projects(*))')
    .order('created_at', { ascending: false })
    .limit(15);

  for (const o of orders || []) {
    console.log(`[Order] ID: ${o.id}, Created: ${o.created_at}, User: ${o.profiles?.full_name}, CompID: ${o.company_id}, CompName: ${o.companies?.name}, CustName: ${o.customer_name}, TypeID: ${o.customer_type_id}`);
    for (const item of o.order_items || []) {
      for (const p of item.order_item_projects || []) {
        console.log(`   -> Project: "${p.project_name}", TypeID: ${p.project_type_id}, AccDev: ${p.account_developer}, AccArch: ${p.account_architecture}, AccInt: ${p.account_interior}`);
      }
    }
  }
}

check();
