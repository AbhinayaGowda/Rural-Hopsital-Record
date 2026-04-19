import { validate } from '../lib/validate.js';
import { updateProfileSchema, adminUpdateProfileSchema } from '../../../shared/schemas/profiles.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as profilesService from '../services/profiles.js';

export async function getMe(req, res) {
  const profile = await profilesService.getProfile(req.profile.id);
  res.json({ data: profile, error: null });
}

export async function updateMe(req, res) {
  const payload = validate(updateProfileSchema, req.body);
  const profile = await profilesService.updateProfile(req.profile.id, payload, req.profile.id);
  res.json({ data: profile, error: null });
}

export async function listProfiles(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await profilesService.listProfiles({ limit, offset });
  res.json({ data: result, error: null });
}

export async function adminUpdateProfile(req, res) {
  const payload = validate(adminUpdateProfileSchema, req.body);
  const profile = await profilesService.updateProfile(req.params.id, payload, req.profile.id);
  res.json({ data: profile, error: null });
}
