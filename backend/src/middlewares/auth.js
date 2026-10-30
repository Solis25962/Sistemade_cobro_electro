import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError.js';

const getSecret = () => process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Token de autenticación no proporcionado'));
  }

  try {
    req.user = jwt.verify(header.slice(7), getSecret());
    next();
  } catch {
    next(new HttpError(401, 'Token inválido o expirado'));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return next(new HttpError(403, 'No tienes permisos para realizar esta acción'));
  }
  next();
};
