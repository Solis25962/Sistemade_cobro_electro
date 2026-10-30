import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

const run = async () => {
  const dbName = process.env.DB_NAME || 'sistema_cobro_electro';
  const skipCreateDatabase = process.env.DB_SKIP_CREATE_DATABASE === 'true';

  let schema = (await fs.readFile(schemaPath, 'utf8')).replaceAll(
    'sistema_cobro_electro',
    dbName
  );

  if (skipCreateDatabase) {
    schema = schema
      .replace(/CREATE DATABASE[\s\S]*?;\s*/i, '')
      .replace(/USE [^;]+;\s*/i, '');
  }

  const ssl =
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
    ...(skipCreateDatabase ? { database: dbName } : {}),
    charset: 'utf8mb4',
    multipleStatements: true,
    ...(ssl ? { ssl } : {})
  });

  try {
    console.log('Ejecutando esquema de base de datos...');
    await connection.query(schema);
    console.log('Base de datos inicializada correctamente.');
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exit(1);
});
