import { z } from 'zod';

export const createMemberSchema = z.object({
  full_name: z.string().min(1).max(200),
  gender: z.enum(['M', 'F', 'O']).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  aadhaar: z.string().regex(/^\d{12}$/).nullable().optional(),
  relation_to_head: z.enum(['self', 'spouse', 'son', 'daughter', 'parent', 'sibling', 'other']).optional(),
  is_head: z.boolean().optional(),
  contact_number: z.string().regex(/^\d{10}$/).nullable().optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export const markDeceasedSchema = z.object({
  deceased_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  cause: z.string().max(500).optional(),
});
