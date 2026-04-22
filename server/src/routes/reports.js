import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/reports.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/households-by-location', ctrl.householdsByLocation);
router.get('/member-demographics',    ctrl.memberDemographics);
router.get('/pregnancies-by-risk',    ctrl.pregnanciesByRisk);
router.get('/vaccination-coverage',   ctrl.vaccinationCoverage);
router.get('/disease-prevalence',     ctrl.diseasePrevalence);
router.get('/deaths-migrations',      ctrl.deathsMigrations);

export default router;
