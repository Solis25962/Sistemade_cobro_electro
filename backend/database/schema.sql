CREATE DATABASE IF NOT EXISTS `sistema_cobro_electro`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sistema_cobro_electro`;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('dueno', 'vendedor') NOT NULL DEFAULT 'vendedor',
  telefono VARCHAR(30) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  direccion VARCHAR(255) NULL,
  cedula VARCHAR(30) NULL,
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clientes_cedula (cedula)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  precio_base DECIMAL(12, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  producto_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  precio_total DECIMAL(12, 2) NOT NULL,
  saldo_pendiente DECIMAL(12, 2) NOT NULL,
  monto_cuota DECIMAL(12, 2) NOT NULL,
  frecuencia ENUM('semanal', 'quincenal', 'mensual') NOT NULL DEFAULT 'mensual',
  total_cuotas INT NOT NULL DEFAULT 1,
  fecha_inicio DATE NOT NULL,
  estado ENUM('activa', 'pagada', 'cancelada') NOT NULL DEFAULT 'activa',
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ventas_cliente (cliente_id),
  KEY idx_ventas_producto (producto_id),
  KEY idx_ventas_vendedor (vendedor_id),
  KEY idx_ventas_estado (estado),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id),
  CONSTRAINT fk_ventas_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT fk_ventas_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS abonos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo_pago ENUM('efectivo', 'transferencia', 'otro') NOT NULL DEFAULT 'efectivo',
  numero_recibo VARCHAR(30) NULL,
  registrado_por INT NULL,
  notas TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_abonos_numero_recibo (numero_recibo),
  KEY idx_abonos_venta (venta_id),
  KEY idx_abonos_fecha (fecha_pago),
  CONSTRAINT fk_abonos_venta FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT fk_abonos_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo ENUM('entrada', 'salida', 'ajuste') NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,
  motivo VARCHAR(255) NULL,
  venta_id INT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mov_producto (producto_id),
  KEY idx_mov_fecha (created_at),
  CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_venta FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE SET NULL,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Datos de ejemplo (contraseñas: admin123 / vendedor123)
INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, rol, telefono) VALUES
  (1, 'Pedro Dueño', 'admin@electro.com', '$2b$10$tVIMXhc9i2sJKeR4No14x.WDBrV5Dn9XVwFZtblbCqvmg/Xubxf2i', 'dueno', '8888-0001'),
  (2, 'Juan Vendedor', 'vendedor@electro.com', '$2b$10$BiKdYaP1EC/6NHW6dAbIL.FTk3EY1rREFiKrmddTR0dCi4ShwZdCW', 'vendedor', '8888-0002');

INSERT IGNORE INTO productos (id, nombre, descripcion, precio_base, stock) VALUES
  (1, 'Cocina de gas 4 hornillas', 'Cocina de gas de acero inoxidable', 5000.00, 4),
  (2, 'Refrigeradora 9 pies', 'Refrigeradora de dos puertas', 8500.00, 8),
  (3, 'Televisor LED 32 pulgadas', 'Televisor LED con control remoto', 6500.00, 10);

INSERT IGNORE INTO clientes (id, nombre, telefono, direccion, cedula, notas) VALUES
  (1, 'Maynor Solís', '50588887777', 'Barrio San Judas, Managua', '001-010190-0001A', 'Cliente de ejemplo');

INSERT IGNORE INTO ventas
  (id, cliente_id, producto_id, vendedor_id, precio_total, saldo_pendiente, monto_cuota, frecuencia, total_cuotas, fecha_inicio, estado, notas)
VALUES
  (1, 1, 1, 2, 5000.00, 4000.00, 1000.00, 'mensual', 5, CURDATE(), 'activa', 'Venta de ejemplo');

INSERT IGNORE INTO abonos (id, venta_id, monto, metodo_pago, numero_recibo, registrado_por, notas) VALUES
  (1, 1, 1000.00, 'efectivo', 'REC-000001', 2, 'Abono inicial de ejemplo');
