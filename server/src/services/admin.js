import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const PROFILE_COLS = 'id, full_name, role, phone, is_active, created_at, updated_at';

// ── Users ────────────────────────────────────────────────────

export async function listUsers({ role, status, q, limit = 50, offset = 0 }) {
  let query = supabaseAdmin
    .from('profiles')
    .select(PROFILE_COLS, { count: 'exact' })
    .order('full_name');

  if (role)   query = query.eq('role', role);
  if (status === 'active')   query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (q)      query = query.ilike('full_name', `%${q}%`);

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return { items: data, total: count, limit, offset };
}

export async function getUser(id) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_COLS)
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'User not found', 404);
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}

export async function createUser({ full_name, email, phone, role, password }, actorId) {
  // 1. Create auth user
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (authErr) {
    if (authErr.message?.includes('already')) throw new AppError('CONFLICT', 'Email already registered', 409);
    throw new AppError('INTERNAL', authErr.message, 500);
  }

  // 2. Upsert profile (trigger may have inserted it already)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: authData.user.id, full_name, phone: phone ?? null, role, is_active: true })
    .select(PROFILE_COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);

  await logAudit({ actorId, action: 'insert', tableName: 'profiles', recordId: data.id, newData: { full_name, role, email } });
  return data;
}

export async function updateUser(id, { full_name, phone, role, is_active }, actorId) {
  const existing = await getUser(id);
  const patch = {};
  if (full_name  !== undefined) patch.full_name  = full_name;
  if (phone      !== undefined) patch.phone      = phone;
  if (role       !== undefined) patch.role       = role;
  if (is_active  !== undefined) patch.is_active  = is_active;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select(PROFILE_COLS)
    .single();
  if (error) throw new AppError('INTERNAL', error.message, 500);

  await logAudit({ actorId, action: 'update', tableName: 'profiles', recordId: id, oldData: existing, newData: data });
  return data;
}

export async function resetPassword(id, newPassword, actorId) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
  if (error) throw new AppError('INTERNAL', error.message, 500);
  await logAudit({ actorId, action: 'update', tableName: 'profiles', recordId: id, newData: { password_reset: true } });
}

// ── Location Assignments ─────────────────────────────────────

export async function getUserAssignments(profileId) {
  const [distRes, villRes] = await Promise.all([
    supabaseAdmin
      .from('user_district_assignments')
      .select('id, district_id, assigned_at, districts(name, state_id, states(code, name))')
      .eq('profile_id', profileId),
    supabaseAdmin
      .from('user_village_assignments')
      .select('id, village_id, assigned_at, villages(name, district_id, districts(name))')
      .eq('profile_id', profileId),
  ]);
  if (distRes.error) throw new AppError('INTERNAL', distRes.error.message, 500);
  if (villRes.error) throw new AppError('INTERNAL', villRes.error.message, 500);
  return { districts: distRes.data, villages: villRes.data };
}

export async function assignDistrict(profileId, districtId, actorId) {
  const { error } = await supabaseAdmin
    .from('user_district_assignments')
    .insert({ profile_id: profileId, district_id: districtId, assigned_by: actorId });
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Already assigned to this district', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
}

export async function removeDistrictAssignment(profileId, districtId) {
  const { error } = await supabaseAdmin
    .from('user_district_assignments')
    .delete()
    .eq('profile_id', profileId)
    .eq('district_id', districtId);
  if (error) throw new AppError('INTERNAL', error.message, 500);
}

export async function assignVillage(profileId, villageId, actorId) {
  const { error } = await supabaseAdmin
    .from('user_village_assignments')
    .insert({ profile_id: profileId, village_id: villageId, assigned_by: actorId });
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Already assigned to this village', 409);
  if (error) throw new AppError('INTERNAL', error.message, 500);
}

export async function removeVillageAssignment(profileId, villageId) {
  const { error } = await supabaseAdmin
    .from('user_village_assignments')
    .delete()
    .eq('profile_id', profileId)
    .eq('village_id', villageId);
  if (error) throw new AppError('INTERNAL', error.message, 500);
}

// ── Outbreak Detection ───────────────────────────────────────

export async function detectOutbreaks(days = 7) {
  const { data, error } = await supabaseAdmin.rpc('rpc_detect_outbreaks', { p_days: days });
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}
