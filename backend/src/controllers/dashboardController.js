import pool from '../config/db.js';

export const getResumen = async (req, res, next) => {
  try {
    const [[ventas]] = await pool.query(`
      SELECT
        COUNT(*) AS total_ventas,
        COALESCE(SUM(precio_total), 0) AS monto_total_vendido,
        COALESCE(SUM(saldo_pendiente), 0) AS saldo_pendiente,
        COALESCE(SUM(estado = 'activa'), 0) AS ventas_activas,
        COALESCE(SUM(estado = 'pagada'), 0) AS ventas_pagadas,
        COALESCE(SUM(estado = 'cancelada'), 0) AS ventas_canceladas
      FROM ventas
    `);

    const [[abonos]] = await pool.query(`
      SELECT
        COUNT(*) AS total_abonos,
        COALESCE(SUM(monto), 0) AS total_recaudado
      FROM abonos
    `);

    const [[clientes]] = await pool.query('SELECT COUNT(*) AS total_clientes FROM clientes');

    const [[productos]] = await pool.query(`
      SELECT
        COUNT(*) AS total_productos,
        COALESCE(SUM(stock), 0) AS unidades_en_stock
      FROM productos
    `);

    const [stockBajo] = await pool.query(`
      SELECT id, nombre, stock, precio_base
      FROM productos
      WHERE stock <= 5
      ORDER BY stock ASC, nombre ASC
    `);

    const [porVendedor] = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        COUNT(v.id) AS total_ventas,
        COALESCE(SUM(v.precio_total), 0) AS monto_vendido,
        COALESCE(SUM(v.saldo_pendiente), 0) AS saldo_pendiente
      FROM usuarios u
      LEFT JOIN ventas v ON v.vendedor_id = u.id
      WHERE u.rol = 'vendedor'
      GROUP BY u.id, u.nombre
      ORDER BY monto_vendido DESC
    `);

    const [abonosRecientes] = await pool.query(`
      SELECT
        a.id,
        a.venta_id,
        a.monto,
        a.fecha_pago,
        a.metodo_pago,
        a.numero_recibo,
        c.nombre AS cliente_nombre
      FROM abonos a
      INNER JOIN ventas v ON a.venta_id = v.id
      INNER JOIN clientes c ON v.cliente_id = c.id
      ORDER BY a.fecha_pago DESC, a.id DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        ventas,
        abonos,
        clientes,
        productos,
        stock_bajo: stockBajo,
        ventas_por_vendedor: porVendedor,
        abonos_recientes: abonosRecientes
      }
    });
  } catch (error) {
    next(error);
  }
};
