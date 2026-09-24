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
  const { data: o } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_projects(*))')
    .eq('id', 'a83c8fa7-f303-4183-9cc0-8eeba1fc4b62')
    .single();
  console.log('Order a83c8fa7:', JSON.stringify(o, null, 2));

  const { data: o2 } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_projects(*))')
    .eq('id', 'f3a60cb6-21dd-4afd-a73a-c1b5ee45406e')
    .single();
  console.log('Order f3a60cb6:', JSON.stringify(o2, null, 2));
}

run();
