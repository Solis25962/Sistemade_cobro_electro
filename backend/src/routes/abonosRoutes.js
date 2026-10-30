import { Router } from 'express';
import {
  getAbonosByVenta,
  createAbono,
  getRecibo,
  deleteAbono
} from '../controllers/abonosController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/venta/:ventaId', getAbonosByVenta);
router.get('/:id/recibo', getRecibo);
router.post('/', createAbono);
router.delete('/:id', authorize('dueno'), deleteAbono);

export default router;
