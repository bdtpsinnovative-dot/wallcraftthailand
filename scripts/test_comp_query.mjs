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

async function testCompanyQuery() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, customer_type_id, customer_types(name)')
    .eq('id', 'a26d8c35-8bcf-4d76-b01c-bc96e3221606')
    .maybeSingle();

  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}

testCompanyQuery();
