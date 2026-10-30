import pool from '../config/db.js';
import { HttpError } from '../utils/httpError.js';
import { buildWhatsAppReceiptUrl } from '../utils/whatsapp.js';

const METODOS_PAGO = ['efectivo', 'transferencia', 'otro'];

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const abonoDetalleSelect = `
  SELECT
    a.*,
    v.vendedor_id,
    c.nombre AS cliente_nombre,
    c.telefono AS cliente_telefono,
    p.nombre AS producto_nombre,
    u.nombre AS vendedor_nombre
  FROM abonos a
  INNER JOIN ventas v ON a.venta_id = v.id
  INNER JOIN clientes c ON v.cliente_id = c.id
  INNER JOIN productos p ON v.producto_id = p.id
  INNER JOIN usuarios u ON v.vendedor_id = u.id
`;

const buildReceipt = (row) =>
  row.cliente_telefono
    ? buildWhatsAppReceiptUrl({
        telefono: row.cliente_telefono,
        clienteNombre: row.cliente_nombre,
        productoNombre: row.producto_nombre,
        montoAbono: row.monto,
        saldoRestante: row.saldo_restante ?? row.saldo_pendiente,
        vendedorNombre: row.vendedor_nombre,
        numeroRecibo: row.numero_recibo
      })
    : null;

export const getAbonosByVenta = async (req, res, next) => {
  try {
    const [ventaRows] = await pool.query(
      'SELECT id, vendedor_id FROM ventas WHERE id = ? LIMIT 1',
      [req.params.ventaId]
    );

    if (!ventaRows.length) {
      throw new HttpError(404, 'Venta no encontrada');
    }

    if (req.user.rol === 'vendedor' && ventaRows[0].vendedor_id !== req.user.id) {
      throw new HttpError(403, 'No tienes permisos para ver los abonos de esta venta');
    }

    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS registrado_por_nombre
       FROM abonos a
       LEFT JOIN usuarios u ON a.registrado_por = u.id
       WHERE a.venta_id = ?
       ORDER BY a.fecha_pago DESC`,
      [req.params.ventaId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const createAbono = async (req, res, next) => {
  const { venta_id, monto, metodo_pago = 'efectivo', notas } = req.body;

  const montoNumerico = Number(monto);
  const metodoPago = METODOS_PAGO.includes(metodo_pago) ? metodo_pago : null;

  if (!venta_id) {
    return next(new HttpError(400, 'La venta es obligatoria'));
  }

  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    return next(new HttpError(400, 'El monto del abono debe ser mayor que cero'));
  }

  if (!metodoPago) {
    return next(new HttpError(400, 'Método de pago inválido. Debe ser efectivo, transferencia u otro'));
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ventaRows] = await connection.query(
      'SELECT * FROM ventas WHERE id = ? FOR UPDATE',
      [venta_id]
    );

    if (!ventaRows.length) {
      throw new HttpError(404, 'Venta no encontrada');
    }

    const venta = ventaRows[0];

    if (req.user.rol === 'vendedor' && venta.vendedor_id !== req.user.id) {
      throw new HttpError(403, 'No tienes permisos para registrar abonos en esta venta');
    }

    if (venta.estado !== 'activa') {
      throw new HttpError(400, `La venta no está activa (estado: ${venta.estado})`);
    }

    const saldoActual = Number(venta.saldo_pendiente);

    if (saldoActual <= 0) {
      throw new HttpError(400, 'La venta ya no tiene saldo pendiente');
    }

    if (montoNumerico > saldoActual) {
      throw new HttpError(
        400,
        `El abono no puede superar el saldo pendiente (C$ ${saldoActual.toFixed(2)})`
      );
    }

    const [abonoResult] = await connection.query(
      `INSERT INTO abonos (venta_id, monto, metodo_pago, registrado_por, notas)
       VALUES (?, ?, ?, ?, ?)`,
      [venta_id, montoNumerico, metodoPago, req.user.id, notas || null]
    );

    const numeroRecibo = `REC-${String(abonoResult.insertId).padStart(6, '0')}`;

    await connection.query('UPDATE abonos SET numero_recibo = ? WHERE id = ?', [
      numeroRecibo,
      abonoResult.insertId
    ]);

    const nuevoSaldo = round2(saldoActual - montoNumerico);
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'activa';

    await connection.query(
      'UPDATE ventas SET saldo_pendiente = ?, estado = ? WHERE id = ?',
      [nuevoSaldo, nuevoEstado, venta_id]
    );

    const [[detalle]] = await connection.query(`${abonoDetalleSelect} WHERE a.id = ?`, [
      abonoResult.insertId
    ]);

    await connection.commit();

    const whatsappUrl = buildReceipt({ ...detalle, saldo_restante: nuevoSaldo });

    res.status(201).json({
      success: true,
      message: 'Abono registrado exitosamente',
      data: {
        id: abonoResult.insertId,
        venta_id,
        monto: montoNumerico,
        metodo_pago: metodoPago,
        numero_recibo: numeroRecibo,
        saldo_pendiente: nuevoSaldo,
        estado_venta: nuevoEstado
      },
      whatsapp_url: whatsappUrl
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

export const getRecibo = async (req, res, next) => {
  try {
    const [[row]] = await pool.query(`${abonoDetalleSelect} WHERE a.id = ? LIMIT 1`, [
      req.params.id
    ]);

    if (!row) {
      throw new HttpError(404, 'Abono no encontrado');
    }

    if (req.user.rol === 'vendedor' && row.vendedor_id !== req.user.id) {
      throw new HttpError(403, 'No tienes permisos para ver este recibo');
    }

    const [ventaRows] = await pool.query('SELECT saldo_pendiente FROM ventas WHERE id = ?', [
      row.venta_id
    ]);

    const whatsappUrl = buildReceipt({
      ...row,
      saldo_restante: Number(ventaRows[0]?.saldo_pendiente ?? 0)
    });

    res.json({ success: true, data: row, whatsapp_url: whatsappUrl });
  } catch (error) {
    next(error);
  }
};

export const deleteAbono = async (req, res, next) => {
  let connection;

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      throw new HttpError(400, 'Identificador de abono inválido');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT a.*, v.saldo_pendiente
       FROM abonos a
       INNER JOIN ventas v ON a.venta_id = v.id
       WHERE a.id = ?
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      throw new HttpError(404, 'Abono no encontrado');
    }

    const abono = rows[0];
    const nuevoSaldo = round2(Number(abono.saldo_pendiente) + Number(abono.monto));

    await connection.query(
      "UPDATE ventas SET saldo_pendiente = ?, estado = 'activa' WHERE id = ?",
      [nuevoSaldo, abono.venta_id]
    );

    await connection.query('DELETE FROM abonos WHERE id = ?', [id]);
    await connection.commit();

    res.json({
      success: true,
      message: 'Abono eliminado y saldo restaurado exitosamente',
      data: { venta_id: abono.venta_id, saldo_pendiente: nuevoSaldo }
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
