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

async function testPoolProjectsQuery() {
  const selectCategories = 'product_categories(name)';
  const selectProjectTypes = 'project_types(name)';
  const selectProfiles = 'profiles(full_name, teams(team_name))';

  let query = supabase
    .from('order_items')
    .select(`
      *,
      ${selectCategories},
      order_item_projects!inner(
        id, 
        area_sqm, 
        project_name,
        is_important,
        project_type_id,
        queue_level,
        project_year,
        ${selectProjectTypes},
        account_developer, 
        contact_developer,
        account_architecture, 
        contact_architecture,
        account_interior, 
        contact_interior,
        account_contractor, 
        contact_contractor,
        is_deleted
      ),
      orders!inner(
        id, 
        created_at, 
        customer_name, 
        phone,
        customer_types(name),
        is_synced, 
        audit_log, 
        admin_edits,
        user_id, 
        team_id,
        ${selectProfiles},
        companies(name, customer_types(name))
      )
    `, { count: 'exact' }) 
    .eq('order_item_projects.is_deleted', false) 
    .order('created_at', { ascending: false })
    .range(0, 10);

  const { data, count, error } = await query;
  if (error) {
    console.error('Query ERROR:', error);
  } else {
    console.log('Query success! Count:', count);
    console.log('First 3 items:');
    for (const item of data?.slice(0, 3) || []) {
      console.log('Item ID:', item.id);
      console.log('Order:', item.orders?.id, 'Cust:', item.orders?.customer_name, 'Comp:', item.orders?.companies);
      console.log('Projects:', item.order_item_projects?.map(p => ({
        name: p.project_name,
        type: p.project_types?.name,
        accDev: p.account_developer,
        accInt: p.account_interior
      })));
    }
  }

  // Check specifically for order f634d403-8f01-4885-a5f6-047bc176b5f5
  const { data: itemSpecific } = await supabase
    .from('order_items')
    .select(`
      *,
      ${selectCategories},
      order_item_projects!inner(*),
      orders!inner(*, companies(name))
    `)
    .eq('order_id', 'f634d403-8f01-4885-a5f6-047bc176b5f5');

  console.log('\nSpecific order item f634d403-8f01-4885-a5f6-047bc176b5f5 in poolprojects query:');
  console.log(JSON.stringify(itemSpecific, null, 2));
}

testPoolProjectsQuery();
