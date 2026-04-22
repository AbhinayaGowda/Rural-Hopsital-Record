import * as svc from '../services/search.js';

export async function searchPerson(req, res) {
  const { q, limit, offset } = req.query;
  const data = await svc.searchPersons({
    q,
    limit:  limit  ? parseInt(limit,  10) : 20,
    offset: offset ? parseInt(offset, 10) : 0,
  }, req.locationScope);
  res.json({ data, error: null });
}
