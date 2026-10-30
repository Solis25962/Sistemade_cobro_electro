import { Router } from 'express';
import { getClientes, createCliente } from '../controllers/clientesController.js';

const router = Router();

router.get('/', getClientes);
router.post('/', createCliente);

export default router;
