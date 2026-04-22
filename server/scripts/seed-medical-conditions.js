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

const conditions = JSON.parse(
  readFileSync(join(__dirname, '../data/icd10-rural-india.json'), 'utf8')
);

async function run() {
  console.log(`Seeding ${conditions.length} medical conditions...`);

  const BATCH = 100;
  let upserted = 0;
  for (let i = 0; i < conditions.length; i += BATCH) {
    const batch = conditions.slice(i, i + BATCH);
    const { error } = await supabase
      .from('medical_conditions')
      .upsert(batch, { onConflict: 'code', ignoreDuplicates: false });
    if (error) { console.error(`Batch ${i / BATCH} error:`, error); process.exit(1); }
    upserted += batch.length;
    process.stdout.write(`\r  ${upserted}/${conditions.length}`);
  }
  console.log('\nDone.');
}

run().catch(err => { console.error(err); process.exit(1); });
