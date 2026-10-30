# Contexto del Proyecto: Sistema de Ventas de Electrodomésticos Casa a Casa

## 1. Descripción General
Aplicación web enfocada en emprendimientos locales para administrar ventas a crédito de electrodomésticos casa a casa. Reemplaza los cuadernos de notas físicos por un sistema digital sencillo para el dueño y accesible para los vendedores en campo.

## 2. Stack Tecnológico
- **Frontend:** React, Vite, CSS.
- **Backend:** Node.js, Express.
- **Base de Datos:** MySQL.
- **Control de Versiones:** Git & GitHub.
- **Despliegue:** Vercel (Frontend) / Servidor Node (Backend).

## 3. Entidades Principales (MySQL)
- `usuarios`: Dueños y vendedores (roles, autenticación, estado).
- `productos`: Catálogo de electrodomésticos, precio y stock.
- `clientes`: Información de contacto, teléfono y dirección detallada.
- `ventas`: Créditos otorgados (ej: Cliente Maynor Solís compró cocina de C$ 5,000 con cuotas de C$ 1,000 mensuales/semanales, vendedor Juan, dueño Pedro, saldo pendiente, estado).
- `abonos`: Registro histórico de pagos y actualización automática del saldo pendiente.

## 4. Funcionalidades Clave Requeridas
1. **Panel del Dueño:** Resumen de ventas totales, control de stock y seguimiento de lo que recauda cada vendedor.
2. **Registro de Ventas (Vendedor):** Asignar producto, cliente, precio total, cuota y frecuencia (semanal/quincenal/mensual).
3. **Control de Abonos:** Registrar pagos rápidos y descontar automáticamente del saldo.
4. **Notificación WhatsApp:** Botón que abre el enlace de WhatsApp (wa.me) con el recibo digital del abono y saldo restante para el cliente.

## 5. Reglas de Diseño
- Interfaz extremadamente limpia, intuitiva y responsive (pensada para uso rápido en dispositivos móviles por parte de los vendedores).
