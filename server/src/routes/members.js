import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/members.js';
import { listVisits, createVisit } from '../controllers/visits.js';
import { listDiseaseHistory, createDiseaseHistory } from '../controllers/diseaseHistory.js';
import { listPregnancies, createPregnancy } from '../controllers/pregnancies.js';
import { listVaccinations } from '../controllers/vaccinations.js';

const router = Router();
const staff = requireRole('doctor', 'ground_staff', 'admin');
const writers = requireRole('ground_staff', 'admin');
const doctors = requireRole('doctor', 'admin');

router.get('/:id', authenticate, staff, ctrl.getOne);
router.patch('/:id', authenticate, requireRole('doctor', 'ground_staff', 'admin'), ctrl.update);
router.post('/:id/deceased', authenticate, writers, ctrl.markDeceased);

// nested sub-resources
router.get('/:memberId/visits', authenticate, staff, listVisits);
router.post('/:memberId/visits', authenticate, doctors, createVisit);

router.get('/:memberId/disease-history', authenticate, staff, listDiseaseHistory);
router.post('/:memberId/disease-history', authenticate, staff, createDiseaseHistory);

router.get('/:memberId/pregnancies', authenticate, staff, listPregnancies);
router.post('/:memberId/pregnancies', authenticate, staff, createPregnancy);

router.get('/:memberId/vaccinations', authenticate, staff, listVaccinations);

export default router;
