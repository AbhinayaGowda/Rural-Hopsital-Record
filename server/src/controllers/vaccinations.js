import { validate } from '../lib/validate.js';
import { createVaccinationSchema, administerVaccinationSchema, batchAdministerSchema } from '../../../shared/schemas/vaccinations.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/vaccinations.js';

export async function listVaccinations(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listVaccinations(req.params.memberId, { limit, offset });
  res.json({ data: result, error: null });
}

export async function create(req, res) {
  const payload = validate(createVaccinationSchema, req.body);
  const vaccination = await svc.createVaccination(req.params.memberId, payload, req.profile.id);
  res.status(201).json({ data: vaccination, error: null });
}

export async function administer(req, res) {
  const payload = validate(administerVaccinationSchema, req.body);
  const vaccination = await svc.administerVaccination(req.params.id, payload, req.profile.id);
  res.json({ data: vaccination, error: null });
}

export async function batchAdminister(req, res) {
  const { doses } = validate(batchAdministerSchema, req.body);
  const result = await svc.batchAdministerVaccinations(doses, req.profile.id);
  res.json({ data: result, error: null });
}
