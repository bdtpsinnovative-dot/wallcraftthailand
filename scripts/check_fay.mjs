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
  console.log('Searching orders for FAY arteriors (a26d8c35-8bcf-4d76-b01c-bc96e3221606)...');
  const { data: fayOrders, error: errFay } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_projects(*))')
    .eq('company_id', 'a26d8c35-8bcf-4d76-b01c-bc96e3221606')
    .order('created_at', { ascending: false });

  console.log('FAY orders count:', fayOrders?.length);
  console.log('FAY orders:', JSON.stringify(fayOrders, null, 2));

  console.log('\nSearching projects with name like Renovate or Retro...');
  const { data: projs } = await supabase
    .from('projects')
    .select('*')
    .ilike('project_name', '%Retro%');
  console.log('Projects:', JSON.stringify(projs, null, 2));

  console.log('\nSearching order_item_projects with project_name like Renovate or Retro...');
  const { data: oipProjs } = await supabase
    .from('order_item_projects')
    .select('*, order_items(*, orders(*))')
    .ilike('project_name', '%Retro%');
  console.log('OIP projects count:', oipProjs?.length);
  console.log('OIP projects:', JSON.stringify(oipProjs, null, 2));
}

check();
