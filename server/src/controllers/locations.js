import * as svc from '../services/locations.js';

export async function getStates(req, res) {
  const data = await svc.listStates();
  res.json({ data, error: null });
}

export async function getDistricts(req, res) {
  const data = await svc.listDistricts(req.query.state_id);
  res.json({ data, error: null });
}

export async function getCities(req, res) {
  const data = await svc.listCities(req.query.district_id);
  res.json({ data, error: null });
}

export async function getVillages(req, res) {
  const data = await svc.listVillages({
    districtId: req.query.district_id,
    q:          req.query.q,
    limit:      req.query.limit ? parseInt(req.query.limit, 10) : 50,
  });
  res.json({ data, error: null });
}

export async function addVillage(req, res) {
  const data = await svc.createVillage({
    districtId: req.body.district_id,
    cityId:     req.body.city_id,
    name:       req.body.name,
    pincode:    req.body.pincode,
  });
  res.status(201).json({ data, error: null });
}

export async function getMedicalConditions(req, res) {
  const data = await svc.listMedicalConditions({
    q:        req.query.q,
    category: req.query.category,
    limit:    req.query.limit ? parseInt(req.query.limit, 10) : 50,
  });
  res.json({ data, error: null });
}
