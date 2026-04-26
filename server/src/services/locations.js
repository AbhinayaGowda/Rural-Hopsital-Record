import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

export async function listStates() {
  const { data, error } = await supabaseAdmin
    .from('states')
    .select('id, code, name')
    .order('name');
  if (error) throw new AppError('INTERNAL', 'Failed to fetch states', 500);
  return data;
}

export async function listDistricts(stateId) {
  let query = supabaseAdmin
    .from('districts')
    .select('id, state_id, name, code')
    .order('name');
  if (stateId) query = query.eq('state_id', stateId);
  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL', 'Failed to fetch districts', 500);
  return data;
}

export async function listCities(districtId) {
  let query = supabaseAdmin
    .from('cities')
    .select('id, district_id, name')
    .order('name');
  if (districtId) query = query.eq('district_id', districtId);
  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL', 'Failed to fetch cities', 500);
  return data;
}

export async function listVillages({ districtId, q, limit = 50 }) {
  let query = supabaseAdmin
    .from('villages')
    .select('id, district_id, city_id, name, pincode, districts(name)')
    .order('name')
    .limit(limit);

  if (districtId) query = query.eq('district_id', districtId);
  if (q)          query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL', 'Failed to fetch villages', 500);
  return data;
}

export async function createVillage({ districtId, cityId, name, pincode }) {
  const { data, error } = await supabaseAdmin
    .from('villages')
    .insert({ district_id: districtId, city_id: cityId ?? null, name, pincode: pincode ?? null, verified: false })
    .select('id, district_id, city_id, name, pincode, verified')
    .single();
  if (error?.code === '23505') {
    // Village already exists — return the existing record so the caller gets a valid village_id
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('villages')
      .select('id, district_id, city_id, name, pincode, verified')
      .eq('district_id', districtId)
      .ilike('name', name)
      .single();
    if (fetchErr) throw new AppError('INTERNAL', 'Failed to fetch existing village', 500);
    return existing;
  }
  if (error) throw new AppError('INTERNAL', 'Failed to create village', 500);
  return data;
}

export async function setVillageVerified(id, verified) {
  const { data, error } = await supabaseAdmin
    .from('villages')
    .update({ verified })
    .eq('id', id)
    .select('id, name, verified')
    .single();
  if (error?.code === 'PGRST116') throw new AppError('NOT_FOUND', 'Village not found', 404);
  if (error) throw new AppError('INTERNAL', 'Failed to update village', 500);
  return data;
}

export async function listMedicalConditions({ q, category, limit = 50 }) {
  let query = supabaseAdmin
    .from('medical_conditions')
    .select('id, code, name, name_short, category, risk_pregnancy, is_chronic')
    .order('name')
    .limit(limit);

  if (category) query = query.eq('category', category);
  if (q)        query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) throw new AppError('INTERNAL', 'Failed to fetch medical conditions', 500);
  return data;
}
