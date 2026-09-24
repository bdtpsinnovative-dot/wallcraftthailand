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

async function repairNatthayaOrders() {
  const fayCompanyId = 'a26d8c35-8bcf-4d76-b01c-bc96e3221606';
  const interiorTypeId = '4c3fa090-15e3-4f31-b2a5-d89a24c63377';
  const projectName = 'Renovate Retro Krungthep Kreetha';
  const fayName = 'FAY arteriors';

  console.log('Repairing Order 1 (f634d403-8f01-4885-a5f6-047bc176b5f5)...');
  const { error: e1 } = await supabase
    .from('orders')
    .update({ company_id: fayCompanyId, customer_type_id: interiorTypeId })
    .eq('id', 'f634d403-8f01-4885-a5f6-047bc176b5f5');
  console.log('Order 1 update error:', e1);

  const { error: ep1 } = await supabase
    .from('order_item_projects')
    .update({ project_name: projectName, account_interior: fayName })
    .eq('id', '637fc4cb-6fb3-4574-8a85-b86e351b9665');
  console.log('Order 1 project update error:', ep1);

  console.log('\nRepairing Order 2 (d524c3c4-7103-44a2-ae24-ab48ac6e0271)...');
  const { error: e2 } = await supabase
    .from('orders')
    .update({ company_id: fayCompanyId, customer_type_id: interiorTypeId })
    .eq('id', 'd524c3c4-7103-44a2-ae24-ab48ac6e0271');
  console.log('Order 2 update error:', e2);

  const { error: ep2 } = await supabase
    .from('order_item_projects')
    .update({ project_name: projectName, account_interior: fayName })
    .eq('id', 'cbc0718f-4ab1-41bc-8b32-bd950f153a13');
  console.log('Order 2 project update error:', ep2);

  console.log('\nDone! Checking repaired orders...');
  const { data } = await supabase
    .from('orders')
    .select('id, company_id, customer_name, companies(name), customer_types(name), order_items(order_item_projects(project_name, account_interior))')
    .in('id', ['f634d403-8f01-4885-a5f6-047bc176b5f5', 'd524c3c4-7103-44a2-ae24-ab48ac6e0271']);

  console.log(JSON.stringify(data, null, 2));
}

repairNatthayaOrders();
