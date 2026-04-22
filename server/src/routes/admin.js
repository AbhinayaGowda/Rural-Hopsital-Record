import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/admin.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

// Users
router.get('/users',     ctrl.listUsers);
router.post('/users',    ctrl.createUser);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id', ctrl.updateUser);
router.post('/users/:id/reset-password', ctrl.resetPassword);

// Location assignments
router.get('/users/:id/assignments',                               ctrl.getAssignments);
router.post('/users/:id/assignments/districts',                    ctrl.addDistrictAssignment);
router.delete('/users/:id/assignments/districts/:districtId',      ctrl.removeDistrictAssignment);
router.post('/users/:id/assignments/villages',                     ctrl.addVillageAssignment);
router.delete('/users/:id/assignments/villages/:villageId',        ctrl.removeVillageAssignment);

export default router;
