import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { buildPaginationMeta, getPagination } from '../utils/pagination.js';
import { registrarMovimientoStock } from '../utils/stock.js';

const FRECUENCIAS = ['semanal', 'quincenal', 'mensual'];
const ESTADOS = ['activa', 'pagada', 'cancelada'];

const ventaSelect = `
  SELECT
    v.*,
    c.nombre AS cliente_nombre,
    c.telefono AS cliente_telefono,
    c.direccion AS cliente_direccion,
    p.nombre AS producto_nombre,
    u.nombre AS vendedor_nombre
  FROM ventas v
  INNER JOIN clientes c ON v.cliente_id = c.id
  INNER JOIN productos p ON v.producto_id = p.id
  INNER JOIN usuarios u ON v.vendedor_id = u.id
`;

const ventaCountSelect = `
  FROM ventas v
  INNER JOIN clientes c ON v.cliente_id = c.id
  INNER JOIN productos p ON v.producto_id = p.id
  INNER JOIN usuarios u ON v.vendedor_id = u.id
`;

export const getVentas = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, { defaultLimit: 12 });
    const search = String(req.query.search || '').trim();
    const estado = String(req.query.estado || '').trim();

    if (estado && !ESTADOS.includes(estado)) {
      throw new HttpError(400, 'Estado inválido. Debe ser activa, pagada o cancelada');
    }

    const condiciones = [];
    const filtros = [];

    if (req.user.rol === 'vendedor') {
      condiciones.push('v.vendedor_id = ?');
      filtros.push(req.user.id);
    }

    if (estado) {
      condiciones.push('v.estado = ?');
      filtros.push(estado);
    }

    if (search) {
      condiciones.push(
        '(c.nombre LIKE ? OR c.telefono LIKE ? OR p.nombre LIKE ? OR u.nombre LIKE ?)'
      );
      filtros.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total ${ventaCountSelect} ${where}`,
      filtros
    );

    const [rows] = await pool.query(
      `${ventaSelect} ${where} ORDER BY v.id DESC LIMIT ? OFFSET ?`,
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

export const getVentaById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${ventaSelect} WHERE v.id = ? LIMIT 1`, [req.params.id]);

    if (!rows.length) {
      throw new HttpError(404, 'Venta no encontrada');
    }

    const venta = rows[0];

    if (req.user.rol === 'vendedor' && venta.vendedor_id !== req.user.id) {
      throw new HttpError(403, 'No tienes permisos para ver esta venta');
    }

    const [abonos] = await pool.query(
      `SELECT a.*, u.nombre AS registrado_por_nombre
       FROM abonos a
       LEFT JOIN usuarios u ON a.registrado_por = u.id
       WHERE a.venta_id = ?
       ORDER BY a.fecha_pago DESC`,
      [venta.id]
    );

    res.json({ success: true, data: { ...venta, abonos } });
  } catch (error) {
    next(error);
  }
};

export const createVenta = async (req, res, next) => {
  const {
    cliente_id,
    producto_id,
    precio_total,
    monto_cuota,
    frecuencia,
    total_cuotas,
    fecha_inicio,
    notas
  } = req.body;

  const vendedor_id =
    req.user.rol === 'vendedor' ? req.user.id : req.body.vendedor_id || req.user.id;

  const precio = Number(precio_total);
  const cuota = Number(monto_cuota);
  const cuotas = Number(total_cuotas);

  if (!cliente_id || !producto_id) {
    return next(new HttpError(400, 'El cliente y el producto son obligatorios'));
  }

  if (!Number.isFinite(precio) || precio <= 0) {
    return next(new HttpError(400, 'El precio total debe ser mayor que cero'));
  }

  if (!Number.isFinite(cuota) || cuota <= 0) {
    return next(new HttpError(400, 'El monto de la cuota debe ser mayor que cero'));
  }

  if (!Number.isInteger(cuotas) || cuotas < 1) {
    return next(new HttpError(400, 'El total de cuotas debe ser un entero mayor o igual a 1'));
  }

  if (!FRECUENCIAS.includes(frecuencia)) {
    return next(new HttpError(400, 'Frecuencia inválida. Debe ser semanal, quincenal o mensual'));
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [clienteRows] = await connection.query('SELECT id FROM clientes WHERE id = ? LIMIT 1', [
      cliente_id
    ]);

    if (!clienteRows.length) {
      throw new HttpError(404, 'Cliente no encontrado');
    }

    const [vendedorRows] = await connection.query(
      "SELECT id FROM usuarios WHERE id = ? AND estado = 'activo' LIMIT 1",
      [vendedor_id]
    );

    if (!vendedorRows.length) {
      throw new HttpError(404, 'Vendedor no encontrado o inactivo');
    }

    const [prodRows] = await connection.query(
      'SELECT stock FROM productos WHERE id = ? FOR UPDATE',
      [producto_id]
    );

    if (!prodRows.length) {
      throw new HttpError(404, 'Producto no encontrado');
    }

    const stockAnterior = prodRows[0].stock;

    if (stockAnterior < 1) {
      throw new HttpError(409, 'No hay stock disponible para este producto');
    }

    await connection.query('UPDATE productos SET stock = stock - 1 WHERE id = ?', [producto_id]);

    const fechaInicio = fecha_inicio || new Date().toISOString().slice(0, 10);

    const [ventaResult] = await connection.query(
      `INSERT INTO ventas
        (cliente_id, producto_id, vendedor_id, precio_total, saldo_pendiente, monto_cuota, frecuencia, total_cuotas, fecha_inicio, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?)`,
      [
        cliente_id,
        producto_id,
        vendedor_id,
        precio,
        precio,
        cuota,
        frecuencia,
        cuotas,
        fechaInicio,
        notas || null
      ]
    );

    await registrarMovimientoStock(connection, {
      producto_id,
      tipo: 'salida',
      cantidad: 1,
      stock_anterior: stockAnterior,
      stock_nuevo: stockAnterior - 1,
      motivo: `Venta #${ventaResult.insertId}`,
      venta_id: ventaResult.insertId,
      usuario_id: req.user.id
    });

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Venta a crédito registrada exitosamente',
      venta_id: ventaResult.insertId
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

export const updateVenta = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de venta inválido');
    }

    const [rows] = await pool.query('SELECT * FROM ventas WHERE id = ? LIMIT 1', [id]);

    if (!rows.length) {
      throw new HttpError(404, 'Venta no encontrada');
    }

    const venta = rows[0];

    if (req.user.rol === 'vendedor' && venta.vendedor_id !== req.user.id) {
      throw new HttpError(403, 'No tienes permisos para editar esta venta');
    }

    if (req.body.notas === undefined) {
      throw new HttpError(400, 'Solo se pueden actualizar las notas de la venta');
    }

    const notas = req.body.notas || null;

    await pool.query('UPDATE ventas SET notas = ? WHERE id = ?', [notas, id]);

    res.json({
      success: true,
      message: 'Notas de la venta actualizadas',
      data: { ...venta, notas }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVenta = async (req, res, next) => {
  let connection;

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de venta inválido');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ventaRows] = await connection.query(
      'SELECT * FROM ventas WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!ventaRows.length) {
      throw new HttpError(404, 'Venta no encontrada');
    }

    const venta = ventaRows[0];

    const [[{ totalAbonos }]] = await connection.query(
      'SELECT COUNT(*) AS totalAbonos FROM abonos WHERE venta_id = ?',
      [id]
    );

    if (totalAbonos > 0) {
      throw new HttpError(
        409,
        'No se puede eliminar la venta porque tiene abonos registrados. Elimina primero los abonos.'
      );
    }

    const [productoRows] = await connection.query(
      'SELECT stock FROM productos WHERE id = ? FOR UPDATE',
      [venta.producto_id]
    );

    if (productoRows.length) {
      const stockAnterior = productoRows[0].stock;

      await connection.query('UPDATE productos SET stock = stock + 1 WHERE id = ?', [
        venta.producto_id
      ]);

      await registrarMovimientoStock(connection, {
        producto_id: venta.producto_id,
        tipo: 'entrada',
        cantidad: 1,
        stock_anterior: stockAnterior,
        stock_nuevo: stockAnterior + 1,
        motivo: `Cancelación de venta #${id}`,
        usuario_id: req.user.id
      });
    }

    await connection.query('DELETE FROM ventas WHERE id = ?', [id]);
    await connection.commit();

    res.json({
      success: true,
      message: 'Venta eliminada y stock restaurado exitosamente'
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
