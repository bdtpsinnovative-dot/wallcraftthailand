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
  const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  console.log('Total projects in DB:', count);

  const { data: defaultProjects } = await supabase.from('projects').select('id, project_name');
  console.log('Projects returned without range/limit:', defaultProjects?.length);

  const found = defaultProjects?.some(p => p.id === '99ba10f6-4c0e-495f-92f7-e6643dca8a8d');
  console.log('Was 99ba10f6-4c0e-495f-92f7-e6643dca8a8d in defaultProjects?:', found);
}

check();
