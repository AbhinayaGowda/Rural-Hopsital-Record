import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/locations.js';

const router = Router();

router.use(authenticate);

router.get('/states',             ctrl.getStates);
router.get('/districts',          ctrl.getDistricts);
router.get('/cities',             ctrl.getCities);
router.get('/villages',           ctrl.getVillages);
router.post('/villages', requireRole('admin'), ctrl.addVillage);

router.get('/medical-conditions', ctrl.getMedicalConditions);

export default router;
