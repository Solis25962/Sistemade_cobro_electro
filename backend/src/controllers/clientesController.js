import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';

export const getClientes = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, { defaultLimit: 20 });
    const search = String(req.query.search || '').trim();

    const where = search
      ? 'WHERE (nombre LIKE ? OR telefono LIKE ? OR cedula LIKE ? OR direccion LIKE ?)'
      : '';
    const filtros = search ? Array(4).fill(`%${search}%`) : [];

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM clientes ${where}`,
      filtros
    );

    const [rows] = await pool.query(
      `SELECT * FROM clientes ${where} ORDER BY nombre ASC LIMIT ? OFFSET ?`,
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

export const createCliente = async (req, res, next) => {
  try {
    const { nombre, telefono, direccion, cedula, notas } = req.body;

    if (!nombre || !telefono) {
      throw new HttpError(400, 'El nombre y el teléfono son obligatorios');
    }

    const [result] = await pool.query(
      'INSERT INTO clientes (nombre, telefono, direccion, cedula, notas) VALUES (?, ?, ?, ?, ?)',
      [nombre, telefono, direccion || null, cedula || null, notas || null]
    );

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return next(new HttpError(409, 'Ya existe un cliente con esa cédula'));
    }
    next(error);
  }
};

export const updateCliente = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de cliente inválido');
    }

    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      throw new HttpError(404, 'Cliente no encontrado');
    }

    const actual = rows[0];
    const nombre = req.body.nombre !== undefined ? String(req.body.nombre).trim() : actual.nombre;
    const telefono =
      req.body.telefono !== undefined ? String(req.body.telefono).trim() : actual.telefono;

    if (!nombre || !telefono) {
      throw new HttpError(400, 'El nombre y el teléfono son obligatorios');
    }

    const direccion =
      req.body.direccion !== undefined ? req.body.direccion || null : actual.direccion;
    const cedula = req.body.cedula !== undefined ? req.body.cedula || null : actual.cedula;
    const notas = req.body.notas !== undefined ? req.body.notas || null : actual.notas;

    await pool.query(
      'UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, cedula = ?, notas = ? WHERE id = ?',
      [nombre, telefono, direccion, cedula, notas, id]
    );

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: { ...actual, nombre, telefono, direccion, cedula, notas }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return next(new HttpError(409, 'Ya existe un cliente con esa cédula'));
    }
    next(error);
  }
};

export const deleteCliente = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de cliente inválido');
    }

    const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [id]);

    if (!result.affectedRows) {
      throw new HttpError(404, 'Cliente no encontrado');
    }

    res.json({ success: true, message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    if (error.errno === 1451) {
      return next(
        new HttpError(409, 'No se puede eliminar el cliente porque tiene ventas registradas')
      );
    }
    next(error);
  }
};
