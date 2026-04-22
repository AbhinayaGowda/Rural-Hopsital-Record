import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const states   = JSON.parse(readFileSync(join(__dirname, '../data/in-states.json'), 'utf8'));
const districts = JSON.parse(readFileSync(join(__dirname, '../data/in-districts.json'), 'utf8'));

async function run() {
  console.log('Seeding states...');
  const { data: stateRows, error: stateErr } = await supabase
    .from('states')
    .upsert(states, { onConflict: 'code', ignoreDuplicates: false })
    .select('id, code');

  if (stateErr) { console.error('States error:', stateErr); process.exit(1); }
  console.log(`  ${stateRows.length} states upserted`);

  const stateIdByCode = Object.fromEntries(stateRows.map(r => [r.code, r.id]));

  const districtRows = [];
  for (const [stateCode, names] of Object.entries(districts)) {
    const stateId = stateIdByCode[stateCode];
    if (!stateId) { console.warn(`  Unknown state code: ${stateCode}`); continue; }
    for (const name of names) {
      districtRows.push({ state_id: stateId, name });
    }
  }

  console.log(`Seeding ${districtRows.length} districts...`);

  // Upsert in batches of 200 to stay within PostgREST limits
  const BATCH = 200;
  let upserted = 0;
  for (let i = 0; i < districtRows.length; i += BATCH) {
    const batch = districtRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('districts')
      .upsert(batch, { onConflict: 'state_id,name', ignoreDuplicates: true });
    if (error) { console.error(`Districts batch ${i / BATCH} error:`, error); process.exit(1); }
    upserted += batch.length;
    process.stdout.write(`\r  ${upserted}/${districtRows.length}`);
  }
  console.log('\nDone.');
}

run().catch(err => { console.error(err); process.exit(1); });
