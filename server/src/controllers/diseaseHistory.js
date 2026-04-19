import { validate } from '../lib/validate.js';
import { createDiseaseHistorySchema, updateDiseaseHistorySchema } from '../../../shared/schemas/diseaseHistory.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/diseaseHistory.js';

export async function listDiseaseHistory(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listDiseaseHistory(req.params.memberId, { limit, offset });
  res.json({ data: result, error: null });
}

export async function getOne(req, res) {
  const entry = await svc.getDiseaseHistoryEntry(req.params.id);
  res.json({ data: entry, error: null });
}

export async function createDiseaseHistory(req, res) {
  const payload = validate(createDiseaseHistorySchema, req.body);
  const entry = await svc.createDiseaseHistory(req.params.memberId, payload, req.profile.id);
  res.status(201).json({ data: entry, error: null });
}

export async function update(req, res) {
  const payload = validate(updateDiseaseHistorySchema, req.body);
  const entry = await svc.updateDiseaseHistory(req.params.id, payload, req.profile.id);
  res.json({ data: entry, error: null });
}
