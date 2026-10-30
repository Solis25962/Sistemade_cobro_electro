import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { registrarMovimientoStock } from '../utils/stock.js';

const STOCK_BAJO_LIMITE = 5;

const parsePrecio = (value) => {
  const precio = Number(value);
  if (!Number.isFinite(precio) || precio < 0) {
    throw new HttpError(400, 'El precio base debe ser un número mayor o igual a cero');
  }
  return precio;
};

const parseStock = (value) => {
  const stock = Number(value);
  if (!Number.isInteger(stock) || stock < 0) {
    throw new HttpError(400, 'El stock debe ser un entero mayor o igual a cero');
  }
  return stock;
};

export const getProductos = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, { defaultLimit: 20 });
    const search = String(req.query.search || '').trim();
    const soloStockBajo = req.query.stock_bajo === 'true';

    const condiciones = [];
    const filtros = [];

    if (search) {
      condiciones.push('(nombre LIKE ? OR descripcion LIKE ?)');
      filtros.push(`%${search}%`, `%${search}%`);
    }

    if (soloStockBajo) {
      condiciones.push('stock <= ?');
      filtros.push(STOCK_BAJO_LIMITE);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM productos ${where}`,
      filtros
    );

    const [rows] = await pool.query(
      `SELECT * FROM productos ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
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

export const getStockBajo = async (req, res, next) => {
  try {
    const limite = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE stock <= ? ORDER BY stock ASC, nombre ASC LIMIT ?',
      [STOCK_BAJO_LIMITE, limite]
    );

    res.json({
      success: true,
      data: rows,
      meta: { limite_stock_bajo: STOCK_BAJO_LIMITE }
    });
  } catch (error) {
    next(error);
  }
};

export const getMovimientosProducto = async (req, res, next) => {
  try {
    const productoId = Number(req.params.id);

    if (!Number.isInteger(productoId) || productoId < 1) {
      throw new HttpError(400, 'Identificador de producto inválido');
    }

    const [productoRows] = await pool.query(
      'SELECT id, nombre, stock FROM productos WHERE id = ? LIMIT 1',
      [productoId]
    );

    if (!productoRows.length) {
      throw new HttpError(404, 'Producto no encontrado');
    }

    const { page, limit, offset } = getPagination(req.query, { defaultLimit: 20 });

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM movimientos_stock WHERE producto_id = ?',
      [productoId]
    );

    const [rows] = await pool.query(
      `SELECT m.*, u.nombre AS usuario_nombre
       FROM movimientos_stock m
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       WHERE m.producto_id = ?
       ORDER BY m.id DESC
       LIMIT ? OFFSET ?`,
      [productoId, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      producto: productoRows[0],
      pagination: buildPaginationMeta(total, page, limit)
    });
  } catch (error) {
    next(error);
  }
};

export const createProducto = async (req, res, next) => {
  let connection;

  try {
    const { nombre, descripcion, precio_base, stock } = req.body;

    if (!nombre) {
      throw new HttpError(400, 'El nombre del producto es obligatorio');
    }

    const precio = parsePrecio(precio_base);
    const stockNumerico = stock === undefined ? 0 : parseStock(stock);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO productos (nombre, descripcion, precio_base, stock) VALUES (?, ?, ?, ?)',
      [nombre, descripcion || null, precio, stockNumerico]
    );

    if (stockNumerico > 0) {
      await registrarMovimientoStock(connection, {
        producto_id: result.insertId,
        tipo: 'entrada',
        cantidad: stockNumerico,
        stock_anterior: 0,
        stock_nuevo: stockNumerico,
        motivo: 'Stock inicial',
        usuario_id: req.user.id
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Producto registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

export const updateProducto = async (req, res, next) => {
  let connection;

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de producto inválido');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM productos WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!rows.length) {
      throw new HttpError(404, 'Producto no encontrado');
    }

    const actual = rows[0];
    const nombre = req.body.nombre !== undefined ? String(req.body.nombre).trim() : actual.nombre;

    if (!nombre) {
      throw new HttpError(400, 'El nombre del producto es obligatorio');
    }

    const descripcion =
      req.body.descripcion !== undefined ? req.body.descripcion || null : actual.descripcion;
    const precio =
      req.body.precio_base !== undefined ? parsePrecio(req.body.precio_base) : actual.precio_base;
    const nuevoStock =
      req.body.stock !== undefined ? parseStock(req.body.stock) : actual.stock;
    const motivo =
      req.body.motivo !== undefined && req.body.motivo
        ? String(req.body.motivo).trim()
        : 'Ajuste manual de inventario';

    await connection.query(
      'UPDATE productos SET nombre = ?, descripcion = ?, precio_base = ?, stock = ? WHERE id = ?',
      [nombre, descripcion, precio, nuevoStock, id]
    );

    if (nuevoStock !== actual.stock) {
      const diferencia = nuevoStock - actual.stock;

      await registrarMovimientoStock(connection, {
        producto_id: id,
        tipo: 'ajuste',
        cantidad: Math.abs(diferencia),
        stock_anterior: actual.stock,
        stock_nuevo: nuevoStock,
        motivo,
        usuario_id: req.user.id
      });
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: { ...actual, nombre, descripcion, precio_base: precio, stock: nuevoStock }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

export const deleteProducto = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de producto inválido');
    }

    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);

    if (!result.affectedRows) {
      throw new HttpError(404, 'Producto no encontrado');
    }

    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    if (error.errno === 1451) {
      return next(
        new HttpError(409, 'No se puede eliminar el producto porque tiene ventas registradas')
      );
    }
    next(error);
  }
};
