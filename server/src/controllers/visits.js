import { validate } from '../lib/validate.js';
import { createVisitSchema, updateVisitSchema } from '../../../shared/schemas/visits.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/visits.js';

export async function listVisits(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listVisits(req.params.memberId, { limit, offset });
  res.json({ data: result, error: null });
}

export async function getOne(req, res) {
  const visit = await svc.getVisit(req.params.id);
  res.json({ data: visit, error: null });
}

export async function createVisit(req, res) {
  const payload = validate(createVisitSchema, req.body);
  const visit = await svc.createVisit(req.params.memberId, payload, req.profile.id);
  res.status(201).json({ data: visit, error: null });
}

export async function update(req, res) {
  const payload = validate(updateVisitSchema, req.body);
  const visit = await svc.updateVisit(req.params.id, payload, req.profile.id);
  res.json({ data: visit, error: null });
}
