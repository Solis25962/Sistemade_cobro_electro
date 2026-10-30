import { useState } from 'react';
import { api } from '../api/client.js';
import { Alert, EmptyState, Loader } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatDateTime, formatMoney } from '../utils/format.js';

const emptyForm = {
  nombre: '',
  descripcion: '',
  precio_base: '',
  stock: '0',
  motivo: ''
};

const tipoMovimientoLabel = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste'
};

export default function Productos() {
  const { isOwner } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

  const { data, pagination, loading, error, reload } = useFetch(`/productos?${params}`);
  const {
    data: lowStockData,
    loading: lowStockLoading,
    reload: reloadLowStock
  } = useFetch('/productos/stock-bajo?limit=5');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [movementsProduct, setMovementsProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState('');

  const productos = data || [];
  const lowStock = lowStockData || [];
  const total = pagination?.total ?? productos.length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (producto) => {
    setEditing(producto);
    setForm({
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      precio_base: String(producto.precio_base ?? ''),
      stock: String(producto.stock ?? 0),
      motivo: ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const refreshAll = async () => {
    await Promise.all([reload(), reloadLowStock()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio_base: Number(form.precio_base),
      stock: Number(form.stock)
    };

    if (editing && form.motivo.trim()) {
      payload.motivo = form.motivo.trim();
    }

    try {
      if (editing) {
        await api.put(`/productos/${editing.id}`, payload);
      } else {
        await api.post('/productos', payload);
      }
      setModalOpen(false);
      await refreshAll();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (producto) => {
    if (!window.confirm(`¿Eliminar el producto ${producto.nombre}?`)) return;

    setDeletingId(producto.id);
    setActionError('');

    try {
      await api.del(`/productos/${producto.id}`);

      if (productos.length === 1 && page > 1) {
        setPage(page - 1);
        await reloadLowStock();
      } else {
        await refreshAll();
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openMovements = async (producto) => {
    setMovementsProduct(producto);
    setMovements([]);
    setMovementsError('');
    setMovementsLoading(true);

    try {
      const response = await api.get(`/productos/${producto.id}/movimientos?limit=50`);
      setMovements(response.data || []);
    } catch (err) {
      setMovementsError(err.message);
    } finally {
      setMovementsLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Productos"
        subtitle="Catálogo, precios y disponibilidad de inventario"
        actions={
          isOwner ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Icon name="plus" size={18} />
              Nuevo producto
            </button>
          ) : null
        }
      />

      {!lowStockLoading && lowStock.length > 0 && (
        <div className="stock-alert">
          <Icon name="alert" size={22} />
          <div>
            <strong>{lowStock.length} producto(s) con stock bajo</strong>
            <p>
              {lowStock.map((producto) => `${producto.nombre} (${producto.stock})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search-bar">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar producto"
            aria-label="Buscar productos"
          />
        </div>
        <span className="muted">{total} productos</span>
      </div>

      <Alert type="error" onClose={() => setActionError('')}>
        {actionError}
      </Alert>

      {loading && <Loader />}

      {!loading && error && (
        <>
          <Alert type="error">{error}</Alert>
          <button type="button" className="btn btn-primary" onClick={reload}>
            Reintentar
          </button>
        </>
      )}

      {!loading && !error && productos.length === 0 && (
        <EmptyState
          title={total ? 'Sin resultados' : 'Aún no hay productos'}
          message={
            total
              ? 'Prueba con otro término de búsqueda.'
              : isOwner
                ? 'Registra tu primer producto para comenzar a vender.'
                : 'El dueño aún no ha registrado productos.'
          }
        />
      )}

      {!loading && !error && productos.length > 0 && (
        <div className="data-grid">
          {productos.map((producto) => {
            const stock = Number(producto.stock);
            const low = stock <= 5;

            return (
              <article key={producto.id} className="data-card product-card">
                <div className="data-card-head">
                  <h3>{producto.nombre}</h3>
                  <span className={`badge ${low ? 'badge-low' : 'badge-ok'}`}>
                    {stock} en stock
                  </span>
                </div>
                <strong className="product-price">{formatMoney(producto.precio_base)}</strong>
                <p className="note">{producto.descripcion || 'Sin descripción registrada.'}</p>
                <div className="product-footer">
                  <span className="muted">Producto #{producto.id}</span>
                  {low && <span className="text-warning">Stock bajo</span>}
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openMovements(producto)}
                  >
                    <Icon name="history" size={15} />
                    Movimientos
                  </button>
                  {isOwner && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(producto)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(producto)}
                        disabled={deletingId === producto.id}
                      >
                        {deletingId === producto.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
      >
        <form className="form" onSubmit={handleSubmit}>
          <Alert type="error" onClose={() => setFormError('')}>
            {formError}
          </Alert>

          <label className="field">
            <span>Nombre del producto *</span>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej. Cocina de gas 4 hornillas"
              required
            />
          </label>

          <label className="field">
            <span>Descripción</span>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows="3"
              placeholder="Características del producto"
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Precio base (C$) *</span>
              <input
                type="number"
                name="precio_base"
                value={form.precio_base}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
            </label>
            <label className="field">
              <span>{editing ? 'Stock actual *' : 'Stock inicial *'}</span>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                min="0"
                step="1"
                required
              />
            </label>
          </div>

          {editing && (
            <label className="field">
              <span>Motivo del ajuste de stock</span>
              <input
                name="motivo"
                value={form.motivo}
                onChange={handleChange}
                placeholder="Ej. Conteo físico, compra a proveedor, producto dañado"
              />
              <small className="hint">
                Si cambias el stock se registrará un movimiento de inventario.
              </small>
            </label>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(movementsProduct)}
        onClose={() => setMovementsProduct(null)}
        title={`Movimientos · ${movementsProduct?.nombre || ''}`}
      >
        <div className="movement-summary">
          <span>Stock actual</span>
          <strong>{movementsProduct?.stock ?? 0} unidades</strong>
        </div>

        <Alert type="error" onClose={() => setMovementsError('')}>
          {movementsError}
        </Alert>

        {movementsLoading && <Loader label="Cargando movimientos..." />}

        {!movementsLoading && !movementsError && movements.length === 0 && (
          <EmptyState
            title="Sin movimientos"
            message="Los ajustes y ventas de este producto aparecerán aquí."
          />
        )}

        {!movementsLoading && !movementsError && movements.length > 0 && (
          <div className="movement-list">
            {movements.map((movimiento) => (
              <article key={movimiento.id} className="movement-item">
                <div className="movement-main">
                  <span className={`badge badge-mov-${movimiento.tipo}`}>
                    {tipoMovimientoLabel[movimiento.tipo] || movimiento.tipo}
                  </span>
                  <div>
                    <strong>
                      {movimiento.stock_anterior} → {movimiento.stock_nuevo} unidades
                    </strong>
                    <p className="note">{movimiento.motivo || 'Sin motivo registrado'}</p>
                  </div>
                </div>
                <div className="movement-meta">
                  <span>{formatDateTime(movimiento.created_at)}</span>
                  <span>{movimiento.usuario_nombre || 'Sistema'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
