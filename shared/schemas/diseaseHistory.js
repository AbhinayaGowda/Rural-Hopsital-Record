import { z } from 'zod';

export const createDiseaseHistorySchema = z.object({
  disease_name: z.string().min(1).max(200),
  diagnosed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  recovered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  status: z.enum(['active', 'recovered', 'chronic']).optional(),
  notes: z.string().optional(),
});

export const updateDiseaseHistorySchema = createDiseaseHistorySchema.partial();
