import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alert, EmptyState, Loader } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useFetch } from '../hooks/useFetch.js';
import {
  estadoLabel,
  formatMoney,
  frecuenciaLabel,
  todayInput
} from '../utils/format.js';

const buildEmptyForm = () => ({
  cliente_id: '',
  producto_id: '',
  precio_total: '',
  monto_cuota: '',
  frecuencia: 'mensual',
  total_cuotas: '1',
  fecha_inicio: todayInput(),
  vendedor_id: '',
  notas: ''
});

const filters = [
  { value: 'todas', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'cancelada', label: 'Canceladas' }
];

export default function Ventas() {
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todas');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: '9' });
  if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
  if (filter !== 'todas') params.set('estado', filter);

  const { data, pagination, loading, error, reload } = useFetch(`/ventas?${params}`);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(buildEmptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [options, setOptions] = useState({ clientes: [], productos: [], vendedores: [] });
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  const ventas = data || [];
  const total = pagination?.total ?? ventas.length;

  const loadOptions = async () => {
    setLoadingOptions(true);
    setOptionsError('');

    try {
      const [clientesRes, productosRes, usuariosRes] = await Promise.all([
        api.get('/clientes?limit=200'),
        api.get('/productos?limit=200'),
        isOwner ? api.get('/auth/usuarios?limit=200') : Promise.resolve({ data: [] })
      ]);

      setOptions({
        clientes: clientesRes.data || [],
        productos: (productosRes.data || []).filter((producto) => Number(producto.stock) > 0),
        vendedores: (usuariosRes.data || []).filter(
          (usuario) => usuario.rol === 'vendedor' && usuario.estado === 'activo'
        )
      });
      setOptionsLoaded(true);
    } catch (err) {
      setOptionsError(err.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const openModal = () => {
    setForm(buildEmptyForm());
    setFormError('');
    setModalOpen(true);

    if (!optionsLoaded) loadOptions();
  };

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleProductChange = (event) => {
    const productoId = event.target.value;
    const producto = options.productos.find((item) => String(item.id) === productoId);

    setForm({
      ...form,
      producto_id: productoId,
      precio_total: producto ? String(producto.precio_base) : ''
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        producto_id: Number(form.producto_id),
        precio_total: Number(form.precio_total),
        monto_cuota: Number(form.monto_cuota),
        frecuencia: form.frecuencia,
        total_cuotas: Number(form.total_cuotas),
        fecha_inicio: form.fecha_inicio,
        notas: form.notas || null
      };

      if (isOwner && form.vendedor_id) {
        payload.vendedor_id = Number(form.vendedor_id);
      }

      const response = await api.post('/ventas', payload);
      setModalOpen(false);
      await reload();
      navigate(`/ventas/${response.venta_id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const precio = Number(form.precio_total);
  const cuotas = Number(form.total_cuotas);
  const sugerencia = precio > 0 && cuotas > 0 ? precio / cuotas : 0;
  const canSubmit =
    !loadingOptions &&
    !optionsError &&
    options.clientes.length > 0 &&
    options.productos.length > 0;

  return (
    <div className="page">
      <PageHeader
        title="Ventas"
        subtitle={isOwner ? 'Todas las ventas a crédito del negocio' : 'Tus ventas y saldos pendientes'}
        actions={
          <button type="button" className="btn btn-primary" onClick={openModal}>
            <Icon name="plus" size={18} />
            Nueva venta
          </button>
        }
      />

      <div className="toolbar toolbar-wrap">
        <div className="search-bar">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por cliente, producto o vendedor"
            aria-label="Buscar ventas"
          />
        </div>

        <div className="segmented">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? 'active' : ''}
              onClick={() => {
                setFilter(item.value);
                setPage(1);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loader />}

      {!loading && error && (
        <>
          <Alert type="error">{error}</Alert>
          <button type="button" className="btn btn-primary" onClick={reload}>
            Reintentar
          </button>
        </>
      )}

      {!loading && !error && ventas.length === 0 && (
        <EmptyState
          title={total ? 'Sin resultados' : 'Aún no hay ventas'}
          message={
            total
              ? 'Cambia el filtro o el término de búsqueda.'
              : 'Registra tu primera venta a crédito para comenzar a cobrar.'
          }
        />
      )}

      {!loading && !error && ventas.length > 0 && (
        <div className="data-grid">
          {ventas.map((venta) => {
            const precioTotal = Number(venta.precio_total);
            const saldo = Number(venta.saldo_pendiente);
            const pagado = Math.max(precioTotal - saldo, 0);
            const porcentaje = precioTotal > 0 ? Math.min((pagado / precioTotal) * 100, 100) : 0;

            return (
              <Link key={venta.id} to={`/ventas/${venta.id}`} className="data-card data-card-link">
                <div className="data-card-head">
                  <h3>{venta.cliente_nombre}</h3>
                  <span className={`badge badge-${venta.estado}`}>{estadoLabel(venta.estado)}</span>
                </div>

                <p className="data-line">
                  <span>Producto</span>
                  <strong>{venta.producto_nombre}</strong>
                </p>

                <div className="sale-metrics">
                  <div>
                    <span>Precio</span>
                    <strong>{formatMoney(venta.precio_total)}</strong>
                  </div>
                  <div>
                    <span>Saldo</span>
                    <strong className={saldo > 0 ? 'text-warning' : 'text-ok'}>
                      {formatMoney(venta.saldo_pendiente)}
                    </strong>
                  </div>
                </div>

                <div className="progress" aria-label={`${Math.round(porcentaje)}% pagado`}>
                  <span style={{ width: `${porcentaje}%` }} />
                </div>

                <div className="sale-footer">
                  <span>
                    {formatMoney(venta.monto_cuota)} · {frecuenciaLabel(venta.frecuencia)}
                  </span>
                  <span>{venta.vendedor_nombre}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva venta a crédito">
        <form className="form" onSubmit={handleSubmit}>
          <Alert type="error" onClose={() => setFormError('')}>
            {formError}
          </Alert>

          {optionsError && (
            <Alert type="error">
              {optionsError}
              <button type="button" className="link-button" onClick={loadOptions}>
                Reintentar
              </button>
            </Alert>
          )}

          {loadingOptions && <p className="muted">Cargando clientes y productos...</p>}

          {!loadingOptions && !optionsError && options.clientes.length === 0 && (
            <Alert type="info">No hay clientes registrados. Primero registra un cliente.</Alert>
          )}

          {!loadingOptions && !optionsError && options.productos.length === 0 && (
            <Alert type="info">No hay productos con stock disponible.</Alert>
          )}

          <label className="field">
            <span>Cliente *</span>
            <select
              name="cliente_id"
              value={form.cliente_id}
              onChange={handleChange}
              required
              disabled={!options.clientes.length}
            >
              <option value="">Selecciona un cliente</option>
              {options.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} · {cliente.telefono}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Producto *</span>
            <select
              name="producto_id"
              value={form.producto_id}
              onChange={handleProductChange}
              required
              disabled={!options.productos.length}
            >
              <option value="">Selecciona un producto</option>
              {options.productos.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.nombre} · {formatMoney(producto.precio_base)} · {producto.stock} uds.
                </option>
              ))}
            </select>
          </label>

          {isOwner && options.vendedores.length > 0 && (
            <label className="field">
              <span>Vendedor</span>
              <select name="vendedor_id" value={form.vendedor_id} onChange={handleChange}>
                <option value="">Asignarme la venta ({user?.nombre})</option>
                {options.vendedores.map((vendedor) => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="form-grid">
            <label className="field">
              <span>Precio total (C$) *</span>
              <input
                type="number"
                name="precio_total"
                value={form.precio_total}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className="field">
              <span>Monto de cuota (C$) *</span>
              <input
                type="number"
                name="monto_cuota"
                value={form.monto_cuota}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                required
              />
              {sugerencia > 0 && (
                <small className="hint">Sugerencia: {formatMoney(sugerencia)} por cuota</small>
              )}
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Frecuencia *</span>
              <select name="frecuencia" value={form.frecuencia} onChange={handleChange}>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </label>
            <label className="field">
              <span>Total de cuotas *</span>
              <input
                type="number"
                name="total_cuotas"
                value={form.total_cuotas}
                onChange={handleChange}
                min="1"
                step="1"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Fecha de inicio *</span>
            <input
              type="date"
              name="fecha_inicio"
              value={form.fecha_inicio}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Notas</span>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows="3"
              placeholder="Condiciones o comentarios de la venta"
            />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !canSubmit}>
              {saving ? 'Registrando...' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
