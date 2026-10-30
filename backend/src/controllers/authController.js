import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';

const ROLES = ['dueno', 'vendedor'];
const ESTADOS = ['activo', 'inactivo'];

const getSecret = () => process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';

const signToken = (user) =>
  jwt.sign(
    { id: user.id, nombre: user.nombre, rol: user.rol },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

const contarOtrosDuenosActivos = async (excluirId) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'dueno' AND estado = 'activo' AND id <> ?",
    [excluirId]
  );
  return total;
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new HttpError(400, 'Email y contraseña son obligatorios');
    }

    const [rows] = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, telefono, estado FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows.length) {
      throw new HttpError(401, 'Credenciales inválidas');
    }

    const user = rows[0];

    if (user.estado !== 'activo') {
      throw new HttpError(403, 'El usuario se encuentra inactivo');
    }

    const passwordValida = await bcrypt.compare(password, user.password_hash);

    if (!passwordValida) {
      throw new HttpError(401, 'Credenciales inválidas');
    }

    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token: signToken(user),
      user: safeUser
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol, telefono, estado FROM usuarios WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (!rows.length) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getUsuarios = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, { defaultLimit: 20 });
    const search = String(req.query.search || '').trim();

    const where = search ? 'WHERE (nombre LIKE ? OR email LIKE ? OR telefono LIKE ?)' : '';
    const filtros = search ? Array(3).fill(`%${search}%`) : [];

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuarios ${where}`,
      filtros
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, telefono, estado, created_at
       FROM usuarios ${where}
       ORDER BY nombre ASC
       LIMIT ? OFFSET ?`,
      [...filtros, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    next(error);
  }
};

export const createUsuario = async (req, res, next) => {
  try {
    const { nombre, email, password, rol = 'vendedor', telefono } = req.body;

    if (!nombre || !email || !password) {
      throw new HttpError(400, 'Nombre, email y contraseña son obligatorios');
    }

    if (String(password).length < 6) {
      throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
    }

    if (!ROLES.includes(rol)) {
      throw new HttpError(400, 'Rol inválido. Debe ser dueno o vendedor');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, passwordHash, rol, telefono || null]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { id: result.insertId, nombre, email, rol, telefono: telefono || null }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return next(new HttpError(409, 'Ya existe un usuario con ese email'));
    }
    next(error);
  }
};

export const updateUsuario = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de usuario inválido');
    }

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      throw new HttpError(404, 'Usuario no encontrado');
    }

    const actual = rows[0];
    const nombre = req.body.nombre !== undefined ? String(req.body.nombre).trim() : actual.nombre;
    const email = req.body.email !== undefined ? String(req.body.email).trim() : actual.email;
    const rol = req.body.rol !== undefined ? req.body.rol : actual.rol;
    const estado = req.body.estado !== undefined ? req.body.estado : actual.estado;
    const telefono =
      req.body.telefono !== undefined ? req.body.telefono || null : actual.telefono;

    if (!nombre || !email) {
      throw new HttpError(400, 'El nombre y el email son obligatorios');
    }

    if (!email.includes('@')) {
      throw new HttpError(400, 'El email no es válido');
    }

    if (!ROLES.includes(rol)) {
      throw new HttpError(400, 'Rol inválido. Debe ser dueno o vendedor');
    }

    if (!ESTADOS.includes(estado)) {
      throw new HttpError(400, 'Estado inválido. Debe ser activo o inactivo');
    }

    if (id === req.user.id && estado === 'inactivo') {
      throw new HttpError(400, 'No puedes desactivar tu propio usuario');
    }

    const dejaDeSerDuenoActivo =
      actual.rol === 'dueno' &&
      actual.estado === 'activo' &&
      (rol !== 'dueno' || estado !== 'activo');

    if (dejaDeSerDuenoActivo && (await contarOtrosDuenosActivos(id)) === 0) {
      throw new HttpError(400, 'Debe existir al menos un dueño activo en el sistema');
    }

    const campos = ['nombre = ?', 'email = ?', 'rol = ?', 'estado = ?', 'telefono = ?'];
    const valores = [nombre, email, rol, estado, telefono];

    if (req.body.password !== undefined && req.body.password !== '') {
      if (String(req.body.password).length < 6) {
        throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres');
      }

      campos.push('password_hash = ?');
      valores.push(await bcrypt.hash(req.body.password, 10));
    }

    await pool.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, [...valores, id]);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { id, nombre, email, rol, telefono, estado }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return next(new HttpError(409, 'Ya existe un usuario con ese email'));
    }
    next(error);
  }
};
