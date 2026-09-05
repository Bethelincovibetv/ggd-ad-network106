const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim().replace(/^["']|["']$/g, '');
    env[match[1].trim()] = val;
  }
});

const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function testInsert() {
  // Test what happens when inserting into syndicate_tasks without user session
  const res = await client.from('syndicate_tasks').insert({
    title: 'Test',
    description: 'Test',
    placements: ['WhatsApp']
  });
  console.log('Direct insert without session:', res);
}

testInsert().catch(console.error);
