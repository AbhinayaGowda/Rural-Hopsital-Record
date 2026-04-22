import { apiFetch } from './client.js';

export const reportsApi = {
  householdsByLocation: ()          => apiFetch('/reports/households-by-location'),
  memberDemographics:   ()          => apiFetch('/reports/member-demographics'),
  pregnanciesByRisk:    ()          => apiFetch('/reports/pregnancies-by-risk'),
  vaccinationCoverage:  ()          => apiFetch('/reports/vaccination-coverage'),
  diseasePrevalence:    (days = 30) => apiFetch(`/reports/disease-prevalence?days=${days}`),
  deathsMigrations:     (days = 30) => apiFetch(`/reports/deaths-migrations?days=${days}`),
};
