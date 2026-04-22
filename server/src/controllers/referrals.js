import { validate } from '../lib/validate.js';
import { createReferralSchema, recordOutcomeSchema } from '../../../shared/schemas/referrals.js';
import { paginationSchema } from '../../../shared/schemas/pagination.js';
import * as svc from '../services/referrals.js';

export async function listReferrals(req, res) {
  const { limit, offset } = validate(paginationSchema, req.query);
  const result = await svc.listReferrals(req.params.memberId, { limit, offset });
  res.json({ data: result, error: null });
}

export async function createReferral(req, res) {
  const payload = validate(createReferralSchema, req.body);
  const referral = await svc.createReferral(req.params.memberId, payload, req.profile.id);
  res.status(201).json({ data: referral, error: null });
}

export async function recordOutcome(req, res) {
  const { outcome } = validate(recordOutcomeSchema, req.body);
  const referral = await svc.recordOutcome(req.params.referralId, outcome, req.profile.id);
  res.json({ data: referral, error: null });
}
