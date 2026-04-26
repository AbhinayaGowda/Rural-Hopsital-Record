import { z } from 'zod';

const locationFields = {
  state_id:             z.string().uuid().optional(),
  district_id:          z.string().uuid().optional(),
  village_id:           z.string().uuid().optional(),
  latitude:             z.number().optional(),
  longitude:            z.number().optional(),
  location_accuracy_m:  z.number().nullable().optional(),
  location_source:      z.string().optional(),
};

export const createHouseholdSchema = z.object({
  malaria_number: z.string().min(1).max(50),
  address_line:   z.string().max(300).optional(),
  village:        z.string().max(100).optional(),
  district:       z.string().max(100).optional(),
  state:          z.string().max(100).optional(),
  pincode:        z.string().regex(/^\d{6}$/).optional(),
  notes:          z.string().optional(),
  ...locationFields,
});

export const updateHouseholdSchema = z.object({
  address_line:   z.string().max(300).optional(),
  village:        z.string().max(100).optional(),
  district:       z.string().max(100).optional(),
  state:          z.string().max(100).optional(),
  pincode:        z.string().regex(/^\d{6}$/).optional(),
  notes:          z.string().optional(),
  ...locationFields,
});

export const searchHouseholdsSchema = z.object({
  malaria_number: z.string().optional(),
  village: z.string().optional(),
  status: z.enum(['active', 'migrated', 'dissolved']).optional(),
  q: z.string().min(2).max(100).optional(),
  unclassified: z.enum(['true','1']).optional(), // admin-only: households with no district_id
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const changeHeadSchema = z.object({
  new_head_member_id: z.string().uuid(),
});

export const migrateHouseholdSchema = z.object({
  migrated_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});
