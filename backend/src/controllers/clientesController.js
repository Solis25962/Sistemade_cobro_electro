import pool from '../config/db.js';

export const getClientes = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const createCliente = async (req, res, next) => {
  try {
    const { nombre, telefono, direccion, cedula, notas } = req.body;
    const [result] = await pool.query(
      'INSERT INTO clientes (nombre, telefono, direccion, cedula, notas) VALUES (?, ?, ?, ?, ?)',
      [nombre, telefono, direccion, cedula, notas]
    );
    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    next(error);
  }
};
