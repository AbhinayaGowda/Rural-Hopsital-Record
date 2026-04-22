import { z } from 'zod';

export const createReferralSchema = z.object({
  referred_to: z.string().min(1).max(200),
  reason:      z.string().min(1).max(1000),
  urgency:     z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  referred_at: z.string().datetime().optional(),
});

export const recordOutcomeSchema = z.object({
  outcome: z.string().min(1).max(1000),
});
