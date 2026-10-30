import { Router } from 'express';
import {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  deleteVenta
} from '../controllers/ventasController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getVentas);
router.get('/:id', getVentaById);
router.post('/', createVenta);
router.patch('/:id', updateVenta);
router.delete('/:id', authorize('dueno'), deleteVenta);

export default router;
