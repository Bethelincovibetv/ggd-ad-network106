const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1].trim()] = val;
  }
});
const { createClient } = require('@supabase/supabase-js');
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
console.log('Testing Supabase URL:', url);
const client = createClient(url, key);

async function test() {
  const res = await client.rpc('create_syndicate_task', {
    p_title: 'test',
    p_description: 'test',
    p_share_link: null,
    p_flyer_url: null,
    p_placements: ['WhatsApp'],
    p_target_state: null,
    p_max_syndicates: 10,
    p_approval_mode: 'manual'
  });
  console.log('RPC result:', res);
}

test().catch(console.error);
