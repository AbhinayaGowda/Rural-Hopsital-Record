import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/fieldVisits.js';

const router = Router();
router.use(authenticate);

const staff = requireRole('ground_staff', 'doctor', 'admin');

router.get('/',             staff,                          ctrl.listFieldVisits);
router.post('/',            staff,                          ctrl.createFieldVisit);
router.patch('/:id',        staff,                          ctrl.updateFieldVisit);
router.get('/unvisited',    requireRole('admin'),           ctrl.getUnvisitedVillages);

export default router;
