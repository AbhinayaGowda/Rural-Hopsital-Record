import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const createPregnancySchema = z.object({
  lmp_date: dateStr.optional(),
  expected_due_date: dateStr.optional(),
  risk_level: z.enum(['low', 'medium', 'high']).default('low'),
  status: z.enum(['active', 'delivered', 'miscarried', 'terminated']).default('active'),
  notes: z.string().optional(),
});

export const updatePregnancySchema = createPregnancySchema.partial();

export const createCheckupSchema = z.object({
  checkup_date: dateStr,
  week_number: z.number().int().min(1).max(45).optional(),
  weight_kg: z.number().positive().optional(),
  bp_systolic: z.number().int().min(50).max(300).optional(),
  bp_diastolic: z.number().int().min(30).max(200).optional(),
  hemoglobin: z.number().positive().optional(),
  notes: z.string().optional(),
  next_checkup_date: dateStr.nullable().optional(),
});

export const deliverSchema = z.object({
  date_of_birth: dateStr.optional(),
  full_name: z.string().max(200).optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  relation_to_head: z.enum(['son', 'daughter', 'other']).default('son'),
  birth_weight_kg: z.number().positive().optional(),
  delivery_type: z.enum(['normal', 'c-section', 'assisted']).optional(),
  complications: z.string().optional(),
});
