import { importHouseholdsCsv } from '../services/csvImport.js';

export async function importHouseholds(req, res) {
  if (!req.file) {
    return res.status(400).json({ data: null, error: { code: 'NO_FILE', message: 'CSV file required' } });
  }
  const result = await importHouseholdsCsv(req.file.buffer, req.profile.id);
  res.status(result.errors.length > 0 ? 422 : 200).json({ data: result, error: null });
}
