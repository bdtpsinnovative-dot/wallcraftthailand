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
  const { data: o1 } = await supabase.from('orders').select('*, order_items(*, order_item_projects(*))').eq('id', 'f634d403-8f01-4885-a5f6-047bc176b5f5').single();
  console.log('Order 1:', JSON.stringify(o1, null, 2));

  const { data: o2 } = await supabase.from('orders').select('*, order_items(*, order_item_projects(*))').eq('id', 'd524c3c4-7103-44a2-ae24-ab48ac6e0271').single();
  console.log('Order 2:', JSON.stringify(o2, null, 2));
}

check();
