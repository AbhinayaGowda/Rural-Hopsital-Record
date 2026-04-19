import { z } from 'zod';

export const createVisitSchema = z.object({
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
});

export const updateVisitSchema = createVisitSchema.partial();
