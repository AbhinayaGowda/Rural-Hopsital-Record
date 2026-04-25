import { generateMemberHealthCard, generateHouseholdHealthCard } from '../services/healthCard.js';

export async function memberHealthCard(req, res) {
  await generateMemberHealthCard(req.params.id, res);
}

export async function householdHealthCard(req, res) {
  await generateHouseholdHealthCard(req.params.id, res);
}
