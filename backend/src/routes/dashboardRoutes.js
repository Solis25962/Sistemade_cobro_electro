import { Router } from 'express';
import { getResumen } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, authorize('dueno'));

router.get('/resumen', getResumen);

export default router;
