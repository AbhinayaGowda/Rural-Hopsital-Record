import * as svc from '../services/reports.js';

export const householdsByLocation = async (req, res) => res.json({ data: await svc.householdsByLocation(), error: null });
export const memberDemographics   = async (req, res) => res.json({ data: await svc.memberDemographics(),   error: null });
export const pregnanciesByRisk    = async (req, res) => res.json({ data: await svc.pregnanciesByRisk(),    error: null });
export const vaccinationCoverage  = async (req, res) => res.json({ data: await svc.vaccinationCoverage(),  error: null });

export const diseasePrevalence = async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days, 10) : 30;
  res.json({ data: await svc.diseasePrevalence(days), error: null });
};

export const deathsMigrations = async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days, 10) : 30;
  res.json({ data: await svc.deathsMigrations(days), error: null });
};
