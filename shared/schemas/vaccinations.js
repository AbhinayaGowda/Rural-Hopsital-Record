import { z } from 'zod';

export const createVaccinationSchema = z.object({
  vaccine_name:      z.string().min(1, 'Vaccine name is required').max(200),
  administered_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  next_dose_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  notes:             z.string().optional(),
});

export const administerVaccinationSchema = z.object({
  administered_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  notes: z.string().optional(),
});

export const batchAdministerSchema = z.object({
  doses: z.array(z.object({
    vaccination_id:    z.string().uuid(),
    administered_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    notes:             z.string().optional(),
  })).min(1).max(20),
});
