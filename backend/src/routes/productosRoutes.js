import { Router } from 'express';
import {
  getProductos,
  getStockBajo,
  getMovimientosProducto,
  createProducto,
  updateProducto,
  deleteProducto
} from '../controllers/productosController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getProductos);
router.get('/stock-bajo', getStockBajo);
router.get('/:id/movimientos', getMovimientosProducto);
router.post('/', authorize('dueno'), createProducto);
router.put('/:id', authorize('dueno'), updateProducto);
router.delete('/:id', authorize('dueno'), deleteProducto);

export default router;
