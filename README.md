# Sistema de Cobro de Electrodomésticos

Aplicación web para administrar ventas a crédito de electrodomésticos casa a casa. Reemplaza el cuaderno físico por un sistema digital con control de clientes, productos, inventario, ventas, abonos y recibos por WhatsApp.

## Aplicación en producción

| Componente | URL |
| --- | --- |
| Frontend | https://sistema-cobro-electro.vercel.app |
| Backend / API | https://cobro-electro-api.onrender.com |
| Health check | https://cobro-electro-api.onrender.com/api/health |
| Repositorio | https://github.com/Solis25962/Sistemade_cobro_electro |

> El frontend está en Vercel, la API en Render y la base de datos MySQL en Aiven.
>
> Los planes gratuitos de Render y Aiven pueden suspender los servicios por inactividad. El primer acceso del día puede tardar hasta un minuto mientras despiertan.

## Stack tecnológico

- **Frontend:** React 19, Vite 8, React Router 7 y CSS responsive.
- **Backend:** Node.js, Express 5, MySQL (`mysql2`), JWT (`jsonwebtoken`), `bcryptjs`.
- **Base de datos:** MySQL 8+ (local o administrada en Aiven).
- **Módulos:** ESM (`"type": "module"`).
- **Despliegue:** Vercel (frontend), Render (backend con Docker), Aiven (MySQL).

## Arquitectura en producción

```text
Navegador (vendedor / dueño)
        │
        ▼
Frontend React  ──►  Vercel
        │  HTTPS (VITE_API_URL)
        ▼
API Express 5  ──►  Render (Docker, plan free)
        │  MySQL + SSL
        ▼
MySQL 8  ──►  Aiven (plan free, base "defaultdb")
```

- El frontend llama a la API usando `VITE_API_URL`.
- La API valida CORS contra `FRONTEND_URL`.
- La API se conecta a MySQL con SSL (`DB_SSL=true`).

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
│   ├── vercel.json                 # Rewrites para React Router
│   ├── .env.example
│   ├── .env.production.example
│   └── package.json
├── render.yaml                     # Blueprint de Render
├── context.md                      # Contexto y requerimientos del proyecto
└── README.md
```

## Requisitos

- **Node.js 20.19+** (recomendado 22 o superior).
- **npm** 10+.
- **MySQL 8+** si vas a ejecutar todo en tu equipo.
- Git.

Verifica las versiones:

```bash
node --version
npm --version
```

---

## Cómo correr el sistema

Tienes dos formas de trabajar:

- **Opción A:** todo local (MySQL instalado en tu equipo).
- **Opción B:** backend local conectado a la MySQL en la nube (Aiven).

### Opción A — Todo local con MySQL

#### 1. Clonar el repositorio

```bash
git clone https://github.com/Solis25962/Sistemade_cobro_electro.git
cd Sistemade_cobro_electro
```

#### 2. Instalar dependencias

```bash
cd backend
npm install

cd ../frontend
npm install
```

#### 3. Configurar el backend

Copia `backend/.env.example` a `backend/.env` y ajusta tus credenciales de MySQL local:

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
JWT_SECRET=cambia_esta_clave_por_una_larga_y_aleatoria
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

En PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
```

#### 4. Inicializar la base de datos

Con MySQL encendido:

```bash
cd backend
npm run db:init
```

Esto crea la base `sistema_cobro_electro`, las tablas, la tabla de movimientos de stock y los datos de ejemplo.

#### 5. Levantar el backend

```bash
cd backend
npm run dev
```

La API queda disponible en `http://localhost:5000`. Verifica:

```bash
curl http://localhost:5000/api/health
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "API del sistema de cobro funcionando",
  "database": "ok"
}
```

#### 6. Levantar el frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

Abre `http://localhost:5173`. En desarrollo, Vite hace proxy de `/api` hacia `http://localhost:5000`, por lo que no necesitas configurar `VITE_API_URL`.

### Opción B — Backend local con la MySQL en la nube

Útil para probar con los datos reales sin instalar MySQL.

1. En `backend/.env` usa las credenciales del proveedor (Aiven):

```env
DB_HOST=tu-host.aivencloud.com
DB_PORT=tu-puerto
DB_USER=avnadmin
DB_PASSWORD=tu-password
DB_NAME=defaultdb
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SKIP_CREATE_DATABASE=true
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

2. No ejecutes `npm run db:init` sobre la base de producción, salvo que quieras recrear las tablas y los datos de ejemplo.

3. Levanta backend y frontend igual que en la Opción A.

> Si quieres que el frontend local consuma la API desplegada, crea `frontend/.env` con:
>
> ```env
> VITE_API_URL=https://cobro-electro-api.onrender.com/api
> ```

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PORT` | Puerto de la API | `5000` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | `••••••` |
| `DB_NAME` | Nombre de la base | `sistema_cobro_electro` / `defaultdb` |
| `DB_SSL` | Activa SSL | `false` local / `true` Aiven |
| `DB_SSL_REJECT_UNAUTHORIZED` | Valida el certificado SSL | `true` / `false` |
| `DB_SKIP_CREATE_DATABASE` | Omite `CREATE DATABASE` en `db:init` | `false` local / `true` Aiven |
| `JWT_SECRET` | Clave para firmar tokens | cadena larga y aleatoria |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` |
| `FRONTEND_URL` | Orígenes permitidos por CORS (separados por coma) | `http://localhost:5173,https://sistema-cobro-electro.vercel.app` |

### Frontend (`frontend/.env`)

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `VITE_API_URL` | URL base de la API | `https://cobro-electro-api.onrender.com/api` |

En desarrollo, si no existe `.env`, el cliente usa `/api` y el proxy de Vite.

## Usuarios de ejemplo

| Rol | Email | Contraseña |
| --- | --- | --- |
| Dueño | `admin@electro.com` | `admin123` |
| Vendedor | `vendedor@electro.com` | `vendedor123` |

> **Importante:** cambia estas contraseñas desde la pantalla de Usuarios antes de usar el sistema en producción.

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
| GET | `/api/health` | Público | Estado de la API y de la base de datos |
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
curl -X POST https://cobro-electro-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@electro.com\",\"password\":\"admin123\"}"
```

### Ejemplo: registrar un abono

```bash
curl -X POST https://cobro-electro-api.onrender.com/api/abonos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d "{\"venta_id\":1,\"monto\":1000,\"metodo_pago\":\"efectivo\"}"
```

La respuesta incluye `data.saldo_pendiente` y `whatsapp_url`.

## Despliegue

### 1. Base de datos MySQL (Aiven)

1. Crea una cuenta en https://aiven.io (no pide tarjeta).
2. Crea un servicio **MySQL** con plan **Free**.
3. Espera a que el servicio esté en estado **Running**.
4. Copia los datos de conexión: host, puerto, usuario (`avnadmin`), contraseña y base (`defaultdb`).
5. Inicializa el esquema una sola vez desde tu equipo:

```env
DB_HOST=tu-host.aivencloud.com
DB_PORT=tu-puerto
DB_USER=avnadmin
DB_PASSWORD=tu-password
DB_NAME=defaultdb
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SKIP_CREATE_DATABASE=true
```

```bash
cd backend
npm run db:init
```

`DB_SKIP_CREATE_DATABASE=true` evita ejecutar `CREATE DATABASE` y se conecta directamente a `defaultdb`. El script solo crea tablas y datos de ejemplo.

### 2. Backend en Render

El repositorio incluye `backend/Dockerfile` y `render.yaml`.

**Opción blueprint:**

1. En Render: **New +** → **Blueprint**.
2. Selecciona el repositorio `Solis25962/Sistemade_cobro_electro`.
3. Render lee `render.yaml` y pide las variables marcadas con `sync: false`.
4. Completa las variables y aplica el deploy.

**Opción manual:**

1. **New +** → **Web Service** → conecta el repositorio.
2. Configura:
   - Runtime: **Docker**.
   - Root Directory: `backend`.
   - Dockerfile Path: `Dockerfile`.
   - Health Check Path: `/api/health`.
   - Plan: **Free**.
3. Agrega las variables de entorno (ver abajo) y despliega.

Variables de entorno en Render:

```env
NODE_ENV=production
PORT=5000
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=defaultdb
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SKIP_CREATE_DATABASE=true
JWT_SECRET=una_clave_larga_y_aleatoria
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://sistema-cobro-electro.vercel.app
```

`FRONTEND_URL` acepta varios orígenes separados por coma. En producción, CORS solo permite esos dominios. Escríbelos sin barra final.

> El plan free de Render duerme el servicio tras un periodo de inactividad. La primera petición puede tardar ~50 segundos.

### 3. Frontend en Vercel

1. Importa el repositorio en Vercel.
2. Configura **Root Directory** en `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Agrega la variable:

```env
VITE_API_URL=https://cobro-electro-api.onrender.com/api
```

6. Despliega.

`frontend/vercel.json` incluye la reescritura necesaria para que React Router funcione al recargar rutas como `/ventas/1`.

### 4. Verificación posterior al despliegue

1. `https://cobro-electro-api.onrender.com/api/health` debe responder `"database": "ok"`.
2. Abre el frontend e inicia sesión con el usuario dueño.
3. Cambia las contraseñas de los usuarios de ejemplo.
4. Registra un cliente, un producto, una venta y un abono de prueba.
5. Verifica el enlace de WhatsApp y el descuento de stock.

## Scripts disponibles

### Backend

| Script | Descripción |
| --- | --- |
| `npm run dev` | Inicia la API con recarga automática (nodemon). |
| `npm start` | Inicia la API en modo normal. |
| `npm run db:init` | Crea la base, tablas, movimientos de stock y datos de ejemplo. |

### Frontend

| Script | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Genera la versión de producción en `dist`. |
| `npm run preview` | Previsualiza la versión compilada. |
| `npm run lint` | Ejecuta el linter (oxlint). |

## Solución de problemas

- **`getaddrinfo ENOTFOUND` al conectar MySQL:** el host no existe o el servicio aún no está listo. Revisa que diga **Running** y copia de nuevo el host.
- **`database: error` en `/api/health`:** credenciales incorrectas, base inexistente o SSL mal configurado. En Aiven usa `DB_SSL=true` y `DB_SSL_REJECT_UNAUTHORIZED=false`.
- **Error de CORS en el navegador:** agrega el dominio exacto del frontend en `FRONTEND_URL` (sin barra final) y redeploy del backend.
- **Build de Render falla con "Dockerfile not found":** el contexto debe ser `backend` y el Dockerfile `backend/Dockerfile`.
- **El frontend muestra 404 en la API:** verifica `VITE_API_URL` en Vercel y vuelve a desplegar (Vite inyecta la variable en tiempo de build).
- **Render tarda en responder:** es normal en el plan free tras inactividad.

## Seguridad y operación

- Cambia `JWT_SECRET` y las contraseñas de ejemplo antes de producción.
- No subas `backend/.env` ni `frontend/.env` al repositorio (ya están en `.gitignore`).
- Activa SSL de MySQL si el proveedor lo requiere.
- Configura respaldos periódicos de la base de datos.
- Rotar la contraseña de MySQL y la API key de Render si se comparten por error.
- En planes gratuitos, Render y Aiven pueden suspender servicios por inactividad.

## Próximos pasos

1. Agregar pruebas automatizadas de los flujos de venta, abono e inventario.
2. Implementar respaldos automáticos y monitoreo de errores.
3. Agregar reportes exportables (PDF/Excel) y cierre de caja.
4. Implementar recuperación de contraseña y auditoría de acciones.
