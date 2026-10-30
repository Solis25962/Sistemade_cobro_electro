import pool from '../config/db.js';

export const getVentas = async (req, res, next) => {
  try {
    const query = `
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
      ORDER BY v.id DESC
    `;
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const createVenta = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const {
      cliente_id,
      producto_id,
      vendedor_id,
      precio_total,
      monto_cuota,
      frecuencia, // 'semanal', 'quincenal', 'mensual'
      total_cuotas,
      fecha_inicio,
      notas
    } = req.body;

    await connection.beginTransaction();

    // 1. Verificar y descontar stock del producto
    const [prodRows] = await connection.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [producto_id]);
    if (!prodRows.length) {
      throw new Error('Producto no encontrado');
    }
    if (prodRows[0].stock < 1) {
      throw new Error('No hay stock disponible para este producto');
    }

    await connection.query('UPDATE productos SET stock = stock - 1 WHERE id = ?', [producto_id]);

    // 2. Registrar venta con saldo_pendiente igual a precio_total inicialmente
    const [ventaResult] = await connection.query(
      `INSERT INTO ventas 
      (cliente_id, producto_id, vendedor_id, precio_total, saldo_pendiente, monto_cuota, frecuencia, total_cuotas, fecha_inicio, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?)`,
      [
        cliente_id,
        producto_id,
        vendedor_id,
        precio_total,
        precio_total,
        monto_cuota,
        frecuencia,
        total_cuotas,
        fecha_inicio || new Date(),
        notas
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Venta a crédito registrada exitosamente',
      venta_id: ventaResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
