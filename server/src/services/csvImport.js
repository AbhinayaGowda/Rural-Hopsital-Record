import { parse } from 'csv-parse/sync';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { AppError } from '../lib/AppError.js';
import { logAudit } from './audit.js';

const REQUIRED_COLS = ['malaria_number', 'village'];

function parseRow(row) {
  return {
    malaria_number: row.malaria_number?.trim(),
    address_line:   row.address_line?.trim()  || null,
    village:        row.village?.trim()        || null,
    district:       row.district?.trim()       || null,
    state:          row.state?.trim()          || null,
    pincode:        row.pincode?.trim()        || null,
    notes:          row.notes?.trim()          || null,
  };
}

export async function importHouseholdsCsv(buffer, actorId) {
  let records;
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    throw new AppError('VALIDATION', `CSV parse error: ${e.message}`, 422);
  }

  const errors   = [];
  const valid    = [];
  const imported = [];
  const skipped  = [];

  // Validate rows
  records.forEach((row, i) => {
    const rowNum = i + 2; // 1-indexed + header row
    for (const col of REQUIRED_COLS) {
      if (!row[col]?.trim()) {
        errors.push({ row: rowNum, field: col, message: `${col} is required` });
      }
    }
    if (!errors.some((e) => e.row === rowNum)) {
      valid.push({ rowNum, data: parseRow(row) });
    }
  });

  if (errors.length > 0) {
    return { imported: [], skipped: [], errors, total: records.length };
  }

  // Check for duplicates within the file
  const seen = new Set();
  for (const { rowNum, data } of valid) {
    if (seen.has(data.malaria_number)) {
      errors.push({ row: rowNum, field: 'malaria_number', message: 'Duplicate within file' });
    } else {
      seen.add(data.malaria_number);
    }
  }

  if (errors.length > 0) {
    return { imported: [], skipped: [], errors, total: records.length };
  }

  // Bulk upsert in a single call (Supabase handles conflicts by malaria_number)
  for (const { rowNum, data } of valid) {
    const { data: result, error } = await supabaseAdmin
      .from('households')
      .insert({ ...data, created_by: actorId })
      .select('id, malaria_number')
      .single();

    if (error?.code === '23505') {
      skipped.push({ row: rowNum, malaria_number: data.malaria_number, reason: 'Already exists' });
    } else if (error) {
      errors.push({ row: rowNum, field: 'malaria_number', message: error.message });
    } else {
      imported.push({ row: rowNum, id: result.id, malaria_number: result.malaria_number });
      await logAudit({ actorId, action: 'insert', tableName: 'households', recordId: result.id, newData: data });
    }
  }

  return { imported, skipped, errors, total: records.length };
}
