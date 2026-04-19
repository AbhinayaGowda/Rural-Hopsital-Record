import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
});

export const adminUpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum(['doctor', 'ground_staff', 'admin']).optional(),
  is_active: z.boolean().optional(),
});
