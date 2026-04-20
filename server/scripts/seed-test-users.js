/**
 * Creates 4 demo users (one per role) in Supabase Auth.
 * Safe to re-run — skips users that already exist.
 * Run: node scripts/seed-test-users.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const USERS = [
  { email: 'admin@demo.health',    password: 'Demo@2026', full_name: 'Demo Admin',          role: 'admin' },
  { email: 'doctor@demo.health',   password: 'Demo@2026', full_name: 'Dr. Anika Sharma',    role: 'doctor' },
  { email: 'doctor2@demo.health',  password: 'Demo@2026', full_name: 'Dr. Rahul Verma',     role: 'doctor' },
  { email: 'staff@demo.health',    password: 'Demo@2026', full_name: 'Priya Ground Staff',  role: 'ground_staff' },
];

console.log('\n=== Seeding test users ===\n');

for (const u of USERS) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
  });

  if (error) {
    if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
      console.log(`  SKIP  ${u.email} (already exists)`);
    } else {
      console.error(`  ERROR ${u.email}: ${error.message}`);
    }
    continue;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: u.full_name, role: u.role })
    .eq('id', data.user.id);

  if (profileError) {
    console.error(`  ERROR updating profile for ${u.email}: ${profileError.message}`);
  } else {
    console.log(`  ✓  ${u.email}  (${u.role})`);
  }
}

console.log('\nDone. All accounts use password: Demo@2026\n');
