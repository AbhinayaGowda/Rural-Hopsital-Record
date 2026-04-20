import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/vaccinations.js';

const router = Router();
const staff = requireRole('doctor', 'ground_staff', 'admin');

router.patch('/:id/administer', authenticate, staff, ctrl.administer);

export default router;
