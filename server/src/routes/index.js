import { Router } from 'express';
import profilesRouter from './profiles.js';
import householdsRouter from './households.js';
import membersRouter from './members.js';
import visitsRouter from './visits.js';
import diseaseHistoryRouter from './diseaseHistory.js';
import pregnanciesRouter from './pregnancies.js';
import vaccinationsRouter from './vaccinations.js';
import auditLogsRouter from './auditLogs.js';
import notificationsRouter from './notifications.js';

const router = Router();

router.use('/profiles', profilesRouter);
router.use('/households', householdsRouter);
router.use('/members', membersRouter);
router.use('/visits', visitsRouter);
router.use('/disease-history', diseaseHistoryRouter);
router.use('/pregnancies', pregnanciesRouter);
router.use('/vaccinations', vaccinationsRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/notifications', notificationsRouter);

export default router;
