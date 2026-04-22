import * as svc from '../services/admin.js';
import { z } from 'zod';
import { validate } from '../lib/validate.js';

const createUserSchema = z.object({
  full_name: z.string().min(2).max(100),
  email:     z.string().email(),
  phone:     z.string().regex(/^\d{10}$/).optional(),
  role:      z.enum(['doctor', 'ground_staff', 'admin']),
  password:  z.string().min(8),
});

const updateUserSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone:     z.string().regex(/^\d{10}$/).nullable().optional(),
  role:      z.enum(['doctor', 'ground_staff', 'admin']).optional(),
  is_active: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export async function listUsers(req, res) {
  const { role, status, q, limit, offset } = req.query;
  const data = await svc.listUsers({
    role, status, q,
    limit:  limit  ? parseInt(limit,  10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  });
  res.json({ data, error: null });
}

export async function getUser(req, res) {
  const user        = await svc.getUser(req.params.id);
  const assignments = await svc.getUserAssignments(req.params.id);
  res.json({ data: { ...user, assignments }, error: null });
}

export async function createUser(req, res) {
  const payload = validate(createUserSchema, req.body);
  const user = await svc.createUser(payload, req.profile.id);
  res.status(201).json({ data: user, error: null });
}

export async function updateUser(req, res) {
  const payload = validate(updateUserSchema, req.body);
  const user = await svc.updateUser(req.params.id, payload, req.profile.id);
  res.json({ data: user, error: null });
}

export async function resetPassword(req, res) {
  const { password } = validate(resetPasswordSchema, req.body);
  await svc.resetPassword(req.params.id, password, req.profile.id);
  res.json({ data: { success: true }, error: null });
}

export async function getAssignments(req, res) {
  const data = await svc.getUserAssignments(req.params.id);
  res.json({ data, error: null });
}

export async function addDistrictAssignment(req, res) {
  const { district_id } = z.object({ district_id: z.string().uuid() }).parse(req.body);
  await svc.assignDistrict(req.params.id, district_id, req.profile.id);
  res.status(201).json({ data: { success: true }, error: null });
}

export async function removeDistrictAssignment(req, res) {
  await svc.removeDistrictAssignment(req.params.id, req.params.districtId);
  res.json({ data: { success: true }, error: null });
}

export async function addVillageAssignment(req, res) {
  const { village_id } = z.object({ village_id: z.string().uuid() }).parse(req.body);
  await svc.assignVillage(req.params.id, village_id, req.profile.id);
  res.status(201).json({ data: { success: true }, error: null });
}

export async function removeVillageAssignment(req, res) {
  await svc.removeVillageAssignment(req.params.id, req.params.villageId);
  res.json({ data: { success: true }, error: null });
}
