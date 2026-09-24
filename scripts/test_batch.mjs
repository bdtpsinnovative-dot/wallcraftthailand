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

async function testBatches() {
  const [b1, b2] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }).range(0, 999),
    supabase.from('projects').select('*').order('created_at', { ascending: false }).range(1000, 1999),
  ]);

  const all = [...(b1.data || []), ...(b2.data || [])];
  console.log('Batch 1:', b1.data?.length, 'Batch 2:', b2.data?.length, 'Total:', all.length);
  const retro = all.filter(p => p.project_name?.includes('Retro'));
  console.log('Found retro:', retro.map(p => p.project_name));
}

testBatches();
