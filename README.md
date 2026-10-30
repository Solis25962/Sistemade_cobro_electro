# Sistema de Cobro de Electrodomésticos

Aplicación para administrar ventas a crédito de electrodomésticos casa a casa, reemplazando el cuaderno físico por un sistema digital con control de clientes, productos, inventario, ventas, abonos y recibos por WhatsApp.

> Estado actual: **backend y frontend funcionales y preparados para despliegue**. Incluye autenticación con roles, paginación, edición/eliminación, movimientos de stock, gestión de usuarios, panel del dueño y recibos por WhatsApp.

## Stack

- **Backend:** Node.js, Express 5, MySQL (`mysql2`), JWT (`jsonwebtoken`), `bcryptjs`.
- **Base de datos:** MySQL 8+.
- **Frontend:** React 19, Vite, React Router y CSS responsive.
- **Módulos:** ESM (`"type": "module"`).
- **Despliegue sugerido:** backend en Render/Railway con Docker, frontend en Vercel y MySQL administrado.

## Estructura del proyecto

```text
Sistemade_Cobro_Electro/
├── backend/
│   ├── database/
│   │   └── schema.sql              # Tablas, relaciones y datos de ejemplo
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # Pool de conexión MySQL (con soporte SSL)
│   │   │   └── initDb.js           # Inicialización de la base de datos
│   │   ├── controllers/            # Auth, clientes, productos, ventas, abonos, dashboard
│   │   ├── middlewares/            # Autenticación, roles y manejo de errores
│   │   ├── routes/                 # Definición de endpoints
│   │   ├── utils/                  # Paginación, stock, WhatsApp y errores HTTP
│   │   └── server.js               # Punto de entrada de la API
│   ├── Dockerfile
│   ├── .env.example
│   ├── .env.production.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                    # Cliente HTTP y manejo de sesión
│   │   ├── components/             # Layout, modales, paginación, iconos y feedback
│   │   ├── context/                # Contexto de autenticación
│   │   ├── hooks/                  # Consultas a la API y búsqueda con debounce
│   │   ├── pages/                  # Login, panel, clientes, productos, ventas y usuarios
│   │   ├── utils/                  # Formatos de moneda, fechas y estados
│   │   ├── App.jsx
│   │   └── styles.css
│   ├── vercel.json
│   ├── .env.example
│   ├── .env.production.example
│   └── package.json
├── render.yaml                     # Blueprint opcional para Render
├── context.md                      # Contexto y requerimientos del proyecto
└── README.md
```

## Puesta en marcha local

### 1. Requisitos

- Node.js 20.19+ (recomendado 22)
- MySQL 8+ en ejecución

### 2. Backend: instalar dependencias

```bash
cd backend
npm install
```

### 3. Backend: configurar variables de entorno

Copia `backend/.env.example` a `backend/.env` y ajusta las credenciales:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sistema_cobro_electro
DB_PORT=3306
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SKIP_CREATE_DATABASE=false
JWT_SECRET=cambia_esta_clave
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Backend: inicializar la base de datos

Con MySQL encendido:

```bash
npm run db:init
```

Esto crea la base `sistema_cobro_electro`, las tablas, la tabla de movimientos de stock y datos de ejemplo.

### 5. Backend: levantar la API

```bash
npm run dev
```

La API queda disponible en `http://localhost:5000`. Verifica con:

```bash
GET http://localhost:5000/api/health
```

### 6. Frontend: instalar dependencias

En otra terminal:

```bash
cd frontend
npm install
```

En desarrollo se usa el proxy de Vite (`/api` → `http://localhost:5000`), por lo que no necesitas crear `.env`.

### 7. Frontend: levantar la aplicación

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Usuarios de ejemplo

| Rol | Email | Contraseña |
| --- | --- | --- |
| Dueño | `admin@electro.com` | `admin123` |
| Vendedor | `vendedor@electro.com` | `vendedor123` |

> Cambia estas contraseñas antes de usar el sistema en producción.

## Funcionalidades

- **Login** con validación de sesión y redirección según el rol.
- **Panel del dueño:** monto vendido, recaudado, saldo por cobrar, clientes, stock bajo, ventas por vendedor y abonos recientes.
- **Clientes:** búsqueda paginada, registro, edición y eliminación.
- **Productos:** catálogo paginado, precios, stock, alertas de inventario bajo, edición, eliminación y consulta de movimientos.
- **Inventario:** cada venta, ajuste manual o cancelación genera un movimiento de stock con usuario, fecha y motivo.
- **Ventas:** búsqueda y filtros por estado, paginación, registro de ventas a crédito y asignación de vendedor.
- **Detalle de venta:** saldo, progreso de pago, historial de abonos, edición de notas, eliminación de abonos y cancelación de la venta.
- **Usuarios:** creación, edición, activación/desactivación y control de roles (solo dueño).
- **Recibos WhatsApp:** después de un abono se genera un enlace directo para enviar el recibo al cliente.
- **Diseño responsive:** barra lateral en escritorio y navegación inferior en móviles.

## Endpoints

Las rutas protegidas requieren el header `Authorization: Bearer <token>`.

### Autenticación y usuarios

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health` | Público | Estado de la API |
| POST | `/api/auth/login` | Público | Inicio de sesión y token JWT |
| GET | `/api/auth/profile` | Autenticado | Perfil del usuario actual |
| GET | `/api/auth/usuarios` | Dueño | Listar usuarios con paginación y búsqueda |
| POST | `/api/auth/usuarios` | Dueño | Crear usuarios (dueño/vendedor) |
| PUT | `/api/auth/usuarios/:id` | Dueño | Editar, cambiar contraseña o activar/desactivar |

### Clientes

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/clientes` | Autenticado | Listar clientes con paginación y búsqueda |
| POST | `/api/clientes` | Autenticado | Registrar cliente |
| PUT | `/api/clientes/:id` | Autenticado | Editar cliente |
| DELETE | `/api/clientes/:id` | Dueño | Eliminar cliente sin ventas asociadas |

### Productos e inventario

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/productos` | Autenticado | Listar productos con paginación, búsqueda y filtro `stock_bajo` |
| GET | `/api/productos/stock-bajo` | Autenticado | Productos con stock menor o igual a 5 |
| GET | `/api/productos/:id/movimientos` | Autenticado | Historial de movimientos de stock |
| POST | `/api/productos` | Dueño | Registrar producto y stock inicial |
| PUT | `/api/productos/:id` | Dueño | Editar producto o ajustar stock |
| DELETE | `/api/productos/:id` | Dueño | Eliminar producto sin ventas asociadas |

### Ventas y abonos

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/ventas` | Autenticado | Listar ventas con paginación, búsqueda y filtro por estado |
| GET | `/api/ventas/:id` | Autenticado | Detalle de venta con sus abonos |
| POST | `/api/ventas` | Autenticado | Registrar venta a crédito y descontar stock |
| PATCH | `/api/ventas/:id` | Autenticado | Actualizar notas de la venta |
| DELETE | `/api/ventas/:id` | Dueño | Eliminar venta sin abonos y restaurar stock |
| GET | `/api/abonos/venta/:ventaId` | Autenticado | Abonos de una venta |
| POST | `/api/abonos` | Autenticado | Registrar abono y recalcular saldo |
| GET | `/api/abonos/:id/recibo` | Autenticado | Datos y enlace WhatsApp del recibo |
| DELETE | `/api/abonos/:id` | Dueño | Eliminar abono y restaurar el saldo |
| GET | `/api/dashboard/resumen` | Dueño | Resumen general del negocio |

### Paginación y filtros

Los listados de clientes, productos, ventas y usuarios aceptan:

- `page`: página solicitada (desde 1).
- `limit`: registros por página (máximo 200).
- `search`: búsqueda por nombre, teléfono, email, cédula, producto o vendedor según el recurso.
- `stock_bajo=true`: solo productos con stock bajo.
- `estado=activa|pagada|cancelada`: filtro de ventas.

La respuesta incluye:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasPrev": false,
    "hasNext": false
  }
}
```

## Reglas de negocio implementadas

- **Autenticación real:** contraseñas con bcrypt y tokens JWT con expiración.
- **Roles:** el dueño administra todo; el vendedor solo ve y cobra sus propias ventas.
- **Ventas:** se registran en una transacción, validan cliente/producto/vendedor y descuentan una unidad de stock con bloqueo `FOR UPDATE`.
- **Abonos:** se registran en una transacción con bloqueo de la venta, no permiten superar el saldo pendiente y actualizan automáticamente `saldo_pendiente`.
- **Estados de venta:** `activa` → `pagada` cuando el saldo llega a cero.
- **Eliminación de abonos:** restaura el saldo pendiente y devuelve la venta a estado `activa`.
- **Eliminación de ventas:** solo se permite si no tiene abonos; restaura una unidad al stock y registra el movimiento.
- **Eliminación de clientes/productos:** se bloquea si tienen ventas asociadas para no perder historial.
- **Inventario:** las entradas, salidas y ajustes quedan registrados en `movimientos_stock` con stock anterior, stock nuevo, motivo y usuario.
- **Usuarios:** no se puede desactivar el propio usuario ni dejar el sistema sin al menos un dueño activo.
- **Recibo:** cada abono genera un número `REC-000001` y un enlace `wa.me` con el recibo digital y saldo restante.
- **Validaciones:** montos positivos, frecuencia válida, stock suficiente y respuestas HTTP 400/401/403/404/409 según el caso.

### Ejemplo: iniciar sesión

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@electro.com\",\"password\":\"admin123\"}"
```

### Ejemplo: registrar un abono

```bash
curl -X POST http://localhost:5000/api/abonos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d "{\"venta_id\":1,\"monto\":1000,\"metodo_pago\":\"efectivo\"}"
```

La respuesta incluye `data.saldo_pendiente` y `whatsapp_url`.

## Despliegue

### 1. Base de datos MySQL

Crea una base MySQL administrada (Railway, Aiven, Clever Cloud, PlanetScale u otro proveedor) y guarda:

- Host y puerto.
- Usuario y contraseña.
- Nombre de la base: `sistema_cobro_electro`.
- Si el proveedor exige SSL, activa `DB_SSL=true`.

Inicializa el esquema una sola vez. Desde tu equipo, con las variables de producción:

```bash
cd backend
npm run db:init
```

Si el proveedor ya creó la base y tu usuario no tiene permiso para crear bases, define:

```env
DB_SKIP_CREATE_DATABASE=true
```

Así el script se conecta directamente a la base existente y solo crea tablas y datos iniciales.

### 2. Backend en Render o Railway

El repositorio incluye `backend/Dockerfile` y `render.yaml`.

En Render puedes usar el blueprint `render.yaml` o crear un **Web Service** con:

- Runtime: Docker.
- Dockerfile: `backend/Dockerfile`.
- Contexto: `backend`.
- Health check: `/api/health`.

Variables de entorno mínimas:

```env
NODE_ENV=production
PORT=5000
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=sistema_cobro_electro
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SKIP_CREATE_DATABASE=true
JWT_SECRET=una_clave_larga_y_aleatoria
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://tu-frontend.vercel.app
```

`FRONTEND_URL` acepta varios orígenes separados por coma. En producción CORS solo permite esos dominios. Escribe las URLs sin barra final.

Si el proveedor de MySQL usa certificados autofirmados, define `DB_SSL_REJECT_UNAUTHORIZED=false`.

### 3. Frontend en Vercel

1. Importa el repositorio en Vercel.
2. Configura **Root Directory** en `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Agrega la variable:

```env
VITE_API_URL=https://tu-backend.onrender.com/api
```

`frontend/vercel.json` ya incluye la reescritura necesaria para que React Router funcione al recargar rutas como `/ventas/1`.

### 4. Verificación posterior al despliegue

- Abre `https://tu-backend/api/health`.
- Inicia sesión con el usuario dueño.
- Cambia la contraseña de los usuarios de ejemplo.
- Registra un cliente, un producto, una venta y un abono de prueba.
- Verifica el enlace de WhatsApp y el descuento de stock.

### Notas de seguridad y operación

- Cambia `JWT_SECRET` y las contraseñas de ejemplo antes de producción.
- No subas `backend/.env` al repositorio.
- Activa SSL de MySQL si el proveedor lo requiere.
- Configura respaldos periódicos de la base de datos.
- En planes gratuitos el backend puede tardar en despertar tras un periodo de inactividad.

## Scripts disponibles

### Backend

- `npm run dev` — inicia la API con recarga automática.
- `npm start` — inicia la API en modo normal.
- `npm run db:init` — crea la base, tablas, movimientos de stock y datos de ejemplo.

### Frontend

- `npm run dev` — inicia el servidor de desarrollo.
- `npm run build` — genera la versión de producción.
- `npm run preview` — previsualiza la versión compilada.
- `npm run lint` — ejecuta el linter.

## Próximos pasos

1. Agregar pruebas automatizadas de los flujos de venta, abono e inventario.
2. Implementar respaldos automáticos y monitoreo de errores.
3. Agregar reportes exportables (PDF/Excel) y cierre de caja.
4. Implementar recuperación de contraseña y auditoría de acciones.
