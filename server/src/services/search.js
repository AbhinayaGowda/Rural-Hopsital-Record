import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

export async function searchPersons({ q, limit = 20, offset = 0 }, scope) {
  if (!q || q.trim().length < 2) {
    throw new AppError('VALIDATION_ERROR', 'Search query must be at least 2 characters', 400);
  }

  if (scope && !scope.isAdmin && scope.districtIds.length === 0 && scope.villageIds.length === 0) {
    return { items: [], total: 0, limit, offset };
  }

  const { data, error } = await supabaseAdmin.rpc('rpc_search_person', {
    p_q:            q.trim(),
    p_limit:        limit,
    p_offset:       offset,
    p_district_ids: scope && !scope.isAdmin ? scope.districtIds : null,
    p_village_ids:  scope && !scope.isAdmin ? scope.villageIds  : null,
  });

  if (error) throw new AppError('INTERNAL', error.message, 500);

  const total = data?.[0]?.total_count ?? 0;
  const items = (data ?? []).map(({ total_count: _tc, ...rest }) => rest);

  return { items, total: Number(total), limit, offset };
}
