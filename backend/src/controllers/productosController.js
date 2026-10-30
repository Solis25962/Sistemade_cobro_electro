import pool from '../config/db.js';

export const getProductos = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const createProducto = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio_base, stock } = req.body;
    const [result] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio_base, stock) VALUES (?, ?, ?, ?)',
      [nombre, descripcion, precio_base, stock || 0]
    );
    res.status(201).json({
      success: true,
      message: 'Producto registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    next(error);
  }
};
