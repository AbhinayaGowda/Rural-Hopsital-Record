import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/profiles.js';

const router = Router();

router.get('/me', authenticate, ctrl.getMe);
router.patch('/me', authenticate, ctrl.updateMe);
router.get('/', authenticate, requireRole('admin'), ctrl.listProfiles);
router.patch('/:id', authenticate, requireRole('admin'), ctrl.adminUpdateProfile);

export default router;
