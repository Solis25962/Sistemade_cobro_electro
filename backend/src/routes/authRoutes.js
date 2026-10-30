import { Router } from 'express';
import {
  login,
  getProfile,
  getUsuarios,
  createUsuario,
  updateUsuario
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/usuarios', authenticate, authorize('dueno'), getUsuarios);
router.post('/usuarios', authenticate, authorize('dueno'), createUsuario);
router.put('/usuarios/:id', authenticate, authorize('dueno'), updateUsuario);

export default router;
