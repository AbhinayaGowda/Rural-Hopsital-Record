import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/auditLogs.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), ctrl.list);

export default router;
