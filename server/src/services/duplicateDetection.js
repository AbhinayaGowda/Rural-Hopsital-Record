import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';

/**
 * Find households that might be duplicates of the proposed new household.
 * Uses trigram similarity on the head member name + village match.
 * Returns top 5 candidates with similarity scores.
 */
export async function findSimilarHouseholds({ village, headName }) {
  if (!village && !headName) return [];

  // trigram-based fuzzy match using pg_trgm via rpc
  const { data, error } = await supabaseAdmin.rpc('rpc_find_duplicate_households', {
    p_village:   village   ?? null,
    p_head_name: headName  ?? null,
    p_limit:     5,
  });
  if (error) throw new AppError('INTERNAL', error.message, 500);
  return data;
}
