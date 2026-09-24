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

async function testRange() {
  const { data, count, error } = await supabase
    .from('projects')
    .select('id, project_name', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 4999);

  console.log('Error:', error);
  console.log('Count:', count, 'Length returned:', data?.length);
  console.log('First 3:', data?.slice(0, 3));
}

testRange();
