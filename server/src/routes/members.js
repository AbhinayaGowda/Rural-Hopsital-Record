import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { scopeToUserLocations } from '../middleware/scopeToUserLocations.js';
import * as ctrl from '../controllers/members.js';
import { listVisits, createVisit } from '../controllers/visits.js';
import { listDiseaseHistory, createDiseaseHistory } from '../controllers/diseaseHistory.js';
import { listPregnancies, createPregnancy } from '../controllers/pregnancies.js';
import { listVaccinations, batchAdminister } from '../controllers/vaccinations.js';
import { listReferrals, createReferral, recordOutcome } from '../controllers/referrals.js';

const router = Router();
const staff   = requireRole('doctor', 'ground_staff', 'admin');
const writers = requireRole('ground_staff', 'admin');
const doctors = requireRole('doctor', 'admin');

router.use(authenticate);
router.use(scopeToUserLocations);

router.get('/:id',           staff,   ctrl.getOne);
router.patch('/:id',         writers, ctrl.update);
router.post('/:id/deceased', writers, ctrl.markDeceased);

router.get('/:memberId/visits',  staff,   listVisits);
router.post('/:memberId/visits', doctors, createVisit);

router.get('/:memberId/disease-history',  staff,   listDiseaseHistory);
router.post('/:memberId/disease-history', doctors, createDiseaseHistory);

router.get('/:memberId/pregnancies',  staff,   listPregnancies);
router.post('/:memberId/pregnancies', doctors, createPregnancy);

router.get('/:memberId/vaccinations',                   staff, listVaccinations);
router.post('/:memberId/vaccinations/batch-administer', staff, batchAdminister);

router.get('/:memberId/referrals',                        staff,   listReferrals);
router.post('/:memberId/referrals',                       doctors, createReferral);
router.patch('/:memberId/referrals/:referralId/outcome',  doctors, recordOutcome);

export default router;
