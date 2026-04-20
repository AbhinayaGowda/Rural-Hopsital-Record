import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import * as ctrl from '../controllers/notifications.js';

const router = Router();

router.get('/', authenticate, ctrl.list);
router.patch('/:id/read', authenticate, ctrl.markRead);

export default router;
