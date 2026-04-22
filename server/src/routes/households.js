import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { scopeToUserLocations } from '../middleware/scopeToUserLocations.js';
import * as ctrl from '../controllers/households.js';
import { listMembers, createMember } from '../controllers/members.js';

const router = Router();
const staff = requireRole('doctor', 'ground_staff', 'admin');
const writers = requireRole('ground_staff', 'admin');

router.use(authenticate);
router.use(scopeToUserLocations);

router.get('/',                     staff,   ctrl.list);
router.post('/',                    writers, ctrl.create);
router.get('/:id',                  staff,   ctrl.getOne);
router.patch('/:id',                writers, ctrl.update);
router.post('/:id/change-head',     writers, ctrl.changeHead);
router.post('/:id/migrate',         writers, ctrl.migrate);

// members nested under household
router.get('/:householdId/members',  staff,   listMembers);
router.post('/:householdId/members', writers, createMember);

export default router;
