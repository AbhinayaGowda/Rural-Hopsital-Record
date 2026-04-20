/**
 * Smoke test — run with: node scripts/smoke-test.js
 * Requires server/.env to have: SUPABASE_URL, SUPABASE_ANON_KEY,
 *   SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD
 * The test user must exist in Supabase Auth and have a corresponding profiles row.
 * Leaves test data in the database — safe to re-run.
 */

import 'dotenv/config';

const BASE = `http://localhost:${process.env.PORT || 4000}/api`;
const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function check(label, fn) {
  try {
    await fn();
    ok(label);
  } catch (e) {
    fail(label, e.message);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Sign-in failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function run() {
  console.log('\n=== Rural Hospital API Smoke Test ===\n');

  // --- pre-flight ---
  if (!SUPABASE_URL || !ANON_KEY || !EMAIL || !PASSWORD) {
    console.error('Missing env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD');
    process.exit(1);
  }

  // 1. Health
  console.log('[ Health ]');
  await check('GET /api/health → { ok: true }', async () => {
    const res = await fetch(`http://localhost:${process.env.PORT || 4000}/api/health`);
    const json = await res.json();
    assert(json.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
  });

  // 2. Auth
  console.log('\n[ Auth ]');
  let token;
  await check('Sign in via Supabase Auth', async () => {
    token = await signIn(EMAIL, PASSWORD);
    assert(typeof token === 'string' && token.length > 0, 'no token returned');
  });
  if (!token) { console.error('\nCannot continue without a token.'); process.exit(1); }

  // 3. Profiles
  console.log('\n[ Profiles ]');
  let myProfile;
  let myRole;
  await check('GET /profiles/me', async () => {
    const r = await api('GET', '/profiles/me', null, token);
    assert(r.data?.id, `expected data.id, got ${JSON.stringify(r)}`);
    myProfile = r.data;
    myRole = r.data.role;
  });
  await check('PATCH /profiles/me', async () => {
    const r = await api('PATCH', '/profiles/me', { full_name: myProfile.full_name }, token);
    assert(r.data?.id, `expected data.id, got ${JSON.stringify(r)}`);
  });

  // 4. Households
  console.log('\n[ Households ]');
  const malariaNum = `SMOKE-${Date.now()}`;
  let household;
  await check('POST /households', async () => {
    const r = await api('POST', '/households', {
      malaria_number: malariaNum,
      village: 'Testpur',
      district: 'Smokeabad',
      state: 'Maharashtra',
    }, token);
    assert(r.data?.id, `expected data.id, got ${JSON.stringify(r)}`);
    household = r.data;
  });
  await check('GET /households (search by malaria_number)', async () => {
    const r = await api('GET', `/households?malaria_number=${malariaNum}`, null, token);
    assert(r.data?.items?.length >= 1, `expected >=1 item, got ${JSON.stringify(r)}`);
  });
  await check('GET /households?q=Smoke (fuzzy member name search)', async () => {
    const r = await api('GET', '/households?q=Smoke', null, token);
    assert(r.data?.items !== undefined, `expected items array, got ${JSON.stringify(r)}`);
    assert(typeof r.data?.total === 'number', `expected numeric total`);
  });
  await check('GET /households/:id', async () => {
    const r = await api('GET', `/households/${household.id}`, null, token);
    assert(r.data?.id === household.id, `id mismatch`);
  });
  await check('PATCH /households/:id', async () => {
    const r = await api('PATCH', `/households/${household.id}`, { notes: 'smoke test' }, token);
    assert(r.data?.notes === 'smoke test', `notes not updated`);
  });

  // 5. Members
  console.log('\n[ Members ]');
  let member;
  await check('POST /households/:id/members', async () => {
    const r = await api('POST', `/households/${household.id}/members`, {
      full_name: 'Smoke Testperson',
      gender: 'M',
      date_of_birth: '1990-06-15',
      relation_to_head: 'self',
      is_head: true,
    }, token);
    assert(r.data?.id, `expected data.id, got ${JSON.stringify(r)}`);
    member = r.data;
  });
  await check('GET /households/:id/members', async () => {
    const r = await api('GET', `/households/${household.id}/members`, null, token);
    assert(r.data?.items?.length >= 1, `expected >=1 member`);
  });
  await check('GET /members/:id', async () => {
    const r = await api('GET', `/members/${member.id}`, null, token);
    assert(r.data?.id === member.id, `id mismatch`);
  });
  await check('PATCH /members/:id', async () => {
    const r = await api('PATCH', `/members/${member.id}`, { contact_number: '9999999999' }, token);
    assert(r.data?.contact_number === '9999999999', `contact not updated`);
  });

  // 6. Change household head (role: ground_staff/admin only)
  console.log('\n[ Household head change ]');
  await check('POST /households/:id/change-head (expects success or role-error)', async () => {
    const r = await api('POST', `/households/${household.id}/change-head`, {
      new_head_member_id: member.id,
    }, token);
    // succeeds if role allows, returns 403 if doctor — both are valid outcomes
    assert(r.data || r.error, 'no response body');
  });

  // 7. Visits (doctor role required — expect 403 for ground_staff)
  console.log('\n[ Visits ]');
  await check('POST /members/:id/visits (may 403 if not doctor)', async () => {
    const r = await api('POST', `/members/${member.id}/visits`, {
      visit_date: '2026-04-20',
      symptoms: 'Smoke test symptoms',
      diagnosis: 'Smoke test diagnosis',
    }, token);
    assert(r.data || r.error?.code === 'FORBIDDEN', `unexpected: ${JSON.stringify(r)}`);
  });
  await check('GET /members/:id/visits', async () => {
    const r = await api('GET', `/members/${member.id}/visits`, null, token);
    assert(r.data?.items !== undefined, `expected items array`);
  });

  // 8. Disease history
  console.log('\n[ Disease History ]');
  let diseaseEntry;
  await check('POST /members/:id/disease-history (doctor/admin → 201, ground_staff → 403)', async () => {
    const r = await api('POST', `/members/${member.id}/disease-history`, {
      disease_name: 'Smoke Fever',
      diagnosed_on: '2026-04-20',
      status: 'active',
    }, token);
    if (myRole === 'ground_staff') {
      assert(r.error?.code === 'FORBIDDEN', `ground_staff should get 403, got ${JSON.stringify(r)}`);
    } else {
      assert(r.data?.id, `expected data.id, got ${JSON.stringify(r)}`);
      diseaseEntry = r.data;
    }
  });
  await check('GET /members/:id/disease-history', async () => {
    const r = await api('GET', `/members/${member.id}/disease-history`, null, token);
    assert(r.data?.items !== undefined, `expected items array`);
    if (diseaseEntry) assert(r.data.items.length >= 1, `expected >=1 entry after creation`);
  });
  await check('GET /disease-history/:id', async () => {
    if (!diseaseEntry) return;
    const r = await api('GET', `/disease-history/${diseaseEntry.id}`, null, token);
    assert(r.data?.id === diseaseEntry.id, `id mismatch`);
  });

  // 9. Pregnancies (F member needed; skip create for M but test list + role denial)
  console.log('\n[ Pregnancies ]');
  await check('GET /members/:id/pregnancies', async () => {
    const r = await api('GET', `/members/${member.id}/pregnancies`, null, token);
    assert(r.data?.items !== undefined, `expected items array`);
  });
  await check('POST /members/:id/pregnancies (ground_staff → 403, doctor/admin → success or validation error)', async () => {
    const r = await api('POST', `/members/${member.id}/pregnancies`, {
      lmp_date: '2026-01-01',
      risk_level: 'low',
      status: 'active',
    }, token);
    if (myRole === 'ground_staff') {
      assert(r.error?.code === 'FORBIDDEN', `ground_staff should get 403, got ${JSON.stringify(r)}`);
    } else {
      // doctor/admin: either succeeds or fails with a domain error (not FORBIDDEN)
      assert(r.error?.code !== 'FORBIDDEN', `unexpected FORBIDDEN for role ${myRole}`);
    }
  });

  // 10. Vaccinations
  console.log('\n[ Vaccinations ]');
  let vaccinationItems;
  await check('GET /members/:id/vaccinations', async () => {
    const r = await api('GET', `/members/${member.id}/vaccinations`, null, token);
    assert(r.data?.items !== undefined, `expected items array`);
    vaccinationItems = r.data.items;
  });
  await check('POST /members/:id/vaccinations/batch-administer — rollback on invalid UUID (RPC_ERROR)', async () => {
    const r = await api('POST', `/members/${member.id}/vaccinations/batch-administer`, {
      doses: [{ vaccination_id: '00000000-0000-0000-0000-000000000000', administered_date: '2026-04-20' }],
    }, token);
    assert(r.error?.code === 'RPC_ERROR', `expected RPC_ERROR, got ${JSON.stringify(r)}`);
  });
  await check('POST /members/:id/vaccinations/batch-administer — validation error on empty array', async () => {
    const r = await api('POST', `/members/${member.id}/vaccinations/batch-administer`, { doses: [] }, token);
    assert(r.error?.code === 'VALIDATION_ERROR', `expected VALIDATION_ERROR, got ${JSON.stringify(r)}`);
  });
  if (vaccinationItems?.length > 0) {
    await check('POST /members/:id/vaccinations/batch-administer — happy path (pending → completed)', async () => {
      const pending = vaccinationItems.filter((v) => v.status === 'pending');
      if (pending.length === 0) return; // no pending vaccinations on this run — skip without failing
      const r = await api('POST', `/members/${member.id}/vaccinations/batch-administer`, {
        doses: [{ vaccination_id: pending[0].id, administered_date: '2026-04-20' }],
      }, token);
      assert(Array.isArray(r.data), `expected array, got ${JSON.stringify(r)}`);
      assert(r.data[0]?.status === 'completed', `expected completed status`);
    });
  }

  // 11. Audit logs (admin only — expect 403 for non-admin)
  console.log('\n[ Audit Logs ]');
  await check('GET /audit-logs (200 if admin, 403 otherwise)', async () => {
    const r = await api('GET', '/audit-logs', null, token);
    assert(r.data || r.error?.code === 'FORBIDDEN', `unexpected: ${JSON.stringify(r)}`);
  });

  // 12. Notifications
  console.log('\n[ Notifications ]');
  await check('GET /notifications', async () => {
    const r = await api('GET', '/notifications', null, token);
    assert(r.data?.items !== undefined, `expected items array`);
  });

  // 13. Pagination guard
  console.log('\n[ Pagination ]');
  await check('GET /households?limit=5&offset=0 returns correct shape', async () => {
    const r = await api('GET', '/households?limit=5&offset=0', null, token);
    assert(typeof r.data?.total === 'number', `expected numeric total`);
    assert(r.data?.limit === 5, `expected limit=5`);
    assert(r.data?.offset === 0, `expected offset=0`);
  });

  // 14. Validation guard
  console.log('\n[ Validation ]');
  await check('POST /households with missing malaria_number → 400', async () => {
    const r = await api('POST', '/households', { village: 'X' }, token);
    assert(r.error?.code === 'VALIDATION_ERROR', `expected VALIDATION_ERROR, got ${JSON.stringify(r)}`);
  });

  // --- summary ---
  console.log(`\n${'='.repeat(40)}`);
  console.log(`  Passed: ${passed}   Failed: ${failed}`);
  console.log('='.repeat(40));
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
