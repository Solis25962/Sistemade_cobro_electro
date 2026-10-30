import { Router } from 'express';
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente
} from '../controllers/clientesController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getClientes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', authorize('dueno'), deleteCliente);

export default router;
