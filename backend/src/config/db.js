import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const ssl =
  process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined;

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_cobro_electro',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(ssl ? { ssl } : {})
});

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(' Conexión exitosa a la base de datos MySQL');
    connection.release();
  } catch (error) {
    console.warn(' Advertencia: No se pudo conectar a MySQL:', error.message);
    console.warn('Verifica las credenciales en backend/.env y que el servicio de MySQL esté corriendo.');
  }
};

export default pool;
