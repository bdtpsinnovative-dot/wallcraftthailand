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
  const { count: nullCount } = await supabase.from('companies').select('*', { count: 'exact', head: true }).is('customer_type_id', null);
  const { count: totalCount } = await supabase.from('companies').select('*', { count: 'exact', head: true });
  console.log(`Companies without customer_type_id: ${nullCount} / ${totalCount}`);
}

check();
