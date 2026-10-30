import { Link } from 'react-router-dom';
import { Alert, EmptyState, Loader } from '../components/Feedback.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { formatDateTime, formatMoney } from '../utils/format.js';

function StatCard({ label, value, hint, tone }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/dashboard/resumen');

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="page">
        <PageHeader title="Panel del dueño" subtitle="Resumen general del negocio" />
        <Alert type="error">{error}</Alert>
        <button type="button" className="btn btn-primary" onClick={reload}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { ventas, abonos, clientes, productos, stock_bajo, ventas_por_vendedor, abonos_recientes } =
    data;

  return (
    <div className="page">
      <PageHeader
        title="Panel del dueño"
        subtitle="Resumen general del negocio"
        actions={
          <button type="button" className="btn btn-ghost" onClick={reload}>
            Actualizar
          </button>
        }
      />

      <section className="stats-grid">
        <StatCard
          label="Monto vendido"
          value={formatMoney(ventas.monto_total_vendido)}
          hint={`${ventas.total_ventas} ventas registradas`}
          tone="blue"
        />
        <StatCard
          label="Recaudado"
          value={formatMoney(abonos.total_recaudado)}
          hint={`${abonos.total_abonos} abonos recibidos`}
          tone="green"
        />
        <StatCard
          label="Saldo por cobrar"
          value={formatMoney(ventas.saldo_pendiente)}
          hint={`${ventas.ventas_activas} ventas activas`}
          tone="amber"
        />
        <StatCard
          label="Clientes"
          value={clientes.total_clientes}
          hint={`${productos.unidades_en_stock} unidades en stock`}
          tone="violet"
        />
      </section>

      <div className="split-grid">
        <section className="card">
          <div className="card-header">
            <h2>Ventas por vendedor</h2>
            <span className="muted">{ventas.ventas_pagadas} ventas pagadas</span>
          </div>

          {ventas_por_vendedor.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Ventas</th>
                    <th>Monto</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas_por_vendedor.map((vendedor) => (
                    <tr key={vendedor.id}>
                      <td>{vendedor.nombre}</td>
                      <td>{vendedor.total_ventas}</td>
                      <td>{formatMoney(vendedor.monto_vendido)}</td>
                      <td>{formatMoney(vendedor.saldo_pendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin vendedores" message="Crea usuarios vendedores para ver su desempeño." />
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Stock bajo</h2>
            <span className="badge badge-low">{stock_bajo.length}</span>
          </div>

          {stock_bajo.length ? (
            <ul className="list">
              {stock_bajo.map((producto) => (
                <li key={producto.id} className="list-item">
                  <div>
                    <strong>{producto.nombre}</strong>
                    <span className="muted">{formatMoney(producto.precio_base)}</span>
                  </div>
                  <span className="badge badge-low">{producto.stock} uds.</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Inventario saludable" message="No hay productos con stock bajo." />
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Abonos recientes</h2>
          <Link to="/ventas" className="link">
            Ver ventas
          </Link>
        </div>

        {abonos_recientes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {abonos_recientes.map((abono) => (
                  <tr key={abono.id}>
                    <td>{abono.numero_recibo || `#${abono.id}`}</td>
                    <td>{abono.cliente_nombre}</td>
                    <td className="money">{formatMoney(abono.monto)}</td>
                    <td>{formatDateTime(abono.fecha_pago)}</td>
                    <td className="table-action">
                      <Link to={`/ventas/${abono.venta_id}`} className="link">
                        Ver venta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin abonos" message="Los abonos que registres aparecerán aquí." />
        )}
      </section>
    </div>
  );
}
