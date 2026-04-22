import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { scopeToUserLocations } from '../middleware/scopeToUserLocations.js';
import * as ctrl from '../controllers/search.js';

const router = Router();
router.use(authenticate);
router.use(scopeToUserLocations);

router.get('/person', ctrl.searchPerson);

export default router;
