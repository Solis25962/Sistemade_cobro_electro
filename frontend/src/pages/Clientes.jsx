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

const emptyForm = {
  nombre: '',
  telefono: '',
  direccion: '',
  cedula: '',
  notas: ''
};

export default function Clientes() {
  const { isOwner } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

  const { data, pagination, loading, error, reload } = useFetch(`/clientes?${params}`);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const clientes = data || [];
  const total = pagination?.total ?? clientes.length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (cliente) => {
    setEditing(cliente);
    setForm({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      cedula: cliente.cedula || '',
      notas: cliente.notas || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      if (editing) {
        await api.put(`/clientes/${editing.id}`, form);
      } else {
        await api.post('/clientes', form);
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cliente) => {
    if (!window.confirm(`¿Eliminar al cliente ${cliente.nombre}?`)) return;

    setDeletingId(cliente.id);
    setActionError('');

    try {
      await api.del(`/clientes/${cliente.id}`);

      if (clientes.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await reload();
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Clientes"
        subtitle="Datos de contacto y dirección de tus clientes"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={18} />
            Nuevo cliente
          </button>
        }
      />

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
            placeholder="Buscar por nombre, teléfono o cédula"
            aria-label="Buscar clientes"
          />
        </div>
        <span className="muted">{total} clientes</span>
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

      {!loading && !error && clientes.length === 0 && (
        <EmptyState
          title={total ? 'Sin resultados' : 'Aún no hay clientes'}
          message={
            total
              ? 'Prueba con otro término de búsqueda.'
              : 'Registra tu primer cliente para comenzar a crear ventas.'
          }
        />
      )}

      {!loading && !error && clientes.length > 0 && (
        <div className="data-grid">
          {clientes.map((cliente) => (
            <article key={cliente.id} className="data-card">
              <div className="data-card-head">
                <h3>{cliente.nombre}</h3>
                <span className="muted">#{cliente.id}</span>
              </div>
              <p className="data-line">
                <span>Teléfono</span>
                <strong>{cliente.telefono}</strong>
              </p>
              <p className="data-line">
                <span>Dirección</span>
                <strong>{cliente.direccion || '—'}</strong>
              </p>
              <p className="data-line">
                <span>Cédula</span>
                <strong>{cliente.cedula || '—'}</strong>
              </p>
              {cliente.notas && <p className="note">{cliente.notas}</p>}
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => openEdit(cliente)}
                >
                  Editar
                </button>
                {isOwner && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(cliente)}
                    disabled={deletingId === cliente.id}
                  >
                    {deletingId === cliente.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <form className="form" onSubmit={handleSubmit}>
          <Alert type="error" onClose={() => setFormError('')}>
            {formError}
          </Alert>

          <label className="field">
            <span>Nombre completo *</span>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej. Maynor Solís"
              required
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Teléfono *</span>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Ej. 50588887777"
                required
              />
            </label>
            <label className="field">
              <span>Cédula</span>
              <input
                name="cedula"
                value={form.cedula}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="field">
            <span>Dirección</span>
            <input
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              placeholder="Barrio, ciudad, referencias"
            />
          </label>

          <label className="field">
            <span>Notas</span>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows="3"
              placeholder="Información adicional del cliente"
            />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
