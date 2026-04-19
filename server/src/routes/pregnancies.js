import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/pregnancies.js';

const router = Router();
const staff = requireRole('doctor', 'ground_staff', 'admin');
const doctors = requireRole('doctor', 'admin');

router.get('/:id', authenticate, staff, ctrl.getOne);
router.patch('/:id', authenticate, doctors, ctrl.update);
router.get('/:id/checkups', authenticate, staff, ctrl.listCheckups);
router.post('/:id/checkups', authenticate, doctors, ctrl.createCheckup);
router.post('/:id/deliver', authenticate, doctors, ctrl.deliver);

export default router;
