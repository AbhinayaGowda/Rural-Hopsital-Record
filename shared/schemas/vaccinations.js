import { z } from 'zod';

export const administerVaccinationSchema = z.object({
  administered_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  notes: z.string().optional(),
});
