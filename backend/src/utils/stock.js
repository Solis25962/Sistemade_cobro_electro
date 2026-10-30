export const registrarMovimientoStock = async (
  connection,
  {
    producto_id,
    tipo,
    cantidad,
    stock_anterior,
    stock_nuevo,
    motivo = null,
    venta_id = null,
    usuario_id = null
  }
) => {
  await connection.query(
    `INSERT INTO movimientos_stock
      (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, venta_id, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      producto_id,
      tipo,
      cantidad,
      stock_anterior,
      stock_nuevo,
      motivo,
      venta_id,
      usuario_id
    ]
  );
};
