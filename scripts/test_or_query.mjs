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
  const kw = 'FAY';
  let query = supabase
    .from('order_items')
    .select('id, order_item_projects!inner(id, project_name, account_interior, account_developer)')
    .or(`project_name.ilike.%${kw}%,account_interior.ilike.%${kw}%,account_developer.ilike.%${kw}%`, { foreignTable: 'order_item_projects' })
    .limit(5);

  const { data, error } = await query;
  console.log('Error:', error);
  console.log('Found:', data?.length);
  console.log('Data:', JSON.stringify(data, null, 2));
}

run();
