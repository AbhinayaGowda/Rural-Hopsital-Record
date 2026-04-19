import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/households.js';
import { listMembers, createMember } from '../controllers/members.js';

const router = Router();
const staff = requireRole('doctor', 'ground_staff', 'admin');
const writers = requireRole('ground_staff', 'admin');

router.get('/', authenticate, staff, ctrl.list);
router.post('/', authenticate, writers, ctrl.create);
router.get('/:id', authenticate, staff, ctrl.getOne);
router.patch('/:id', authenticate, writers, ctrl.update);
router.post('/:id/change-head', authenticate, writers, ctrl.changeHead);
router.post('/:id/migrate', authenticate, writers, ctrl.migrate);

// members nested under household
router.get('/:householdId/members', authenticate, staff, listMembers);
router.post('/:householdId/members', authenticate, writers, createMember);

export default router;
