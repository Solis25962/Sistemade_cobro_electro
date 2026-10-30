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
  email: '',
  password: '',
  rol: 'vendedor',
  telefono: '',
  estado: 'activo'
};

const rolLabel = { dueno: 'Dueño', vendedor: 'Vendedor' };

export default function Usuarios() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

  const { data, pagination, loading, error, reload } = useFetch(`/auth/usuarios?${params}`);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const usuarios = data || [];
  const total = pagination?.total ?? usuarios.length;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (usuario) => {
    setEditing(usuario);
    setForm({
      nombre: usuario.nombre || '',
      email: usuario.email || '',
      password: '',
      rol: usuario.rol || 'vendedor',
      telefono: usuario.telefono || '',
      estado: usuario.estado || 'activo'
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

    const payload = {
      nombre: form.nombre,
      email: form.email,
      rol: form.rol,
      telefono: form.telefono,
      estado: form.estado
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editing) {
        await api.put(`/auth/usuarios/${editing.id}`, payload);
      } else {
        await api.post('/auth/usuarios', payload);
      }
      setModalOpen(false);
      await reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEstado = async (usuario) => {
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
    const accion = nuevoEstado === 'activo' ? 'activar' : 'desactivar';

    if (!window.confirm(`¿${accion[0].toUpperCase()}${accion.slice(1)} a ${usuario.nombre}?`)) {
      return;
    }

    setTogglingId(usuario.id);
    setActionError('');

    try {
      await api.put(`/auth/usuarios/${usuario.id}`, { estado: nuevoEstado });
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Usuarios"
        subtitle="Administra dueños y vendedores del negocio"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Icon name="plus" size={18} />
            Nuevo usuario
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
            placeholder="Buscar por nombre, email o teléfono"
            aria-label="Buscar usuarios"
          />
        </div>
        <span className="muted">{total} usuarios</span>
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

      {!loading && !error && usuarios.length === 0 && (
        <EmptyState
          title={total ? 'Sin resultados' : 'Aún no hay usuarios'}
          message={
            total
              ? 'Prueba con otro término de búsqueda.'
              : 'Crea usuarios para que tus vendedores registren ventas y abonos.'
          }
        />
      )}

      {!loading && !error && usuarios.length > 0 && (
        <div className="data-grid">
          {usuarios.map((usuario) => {
            const esMiUsuario = usuario.id === user?.id;

            return (
              <article key={usuario.id} className="data-card">
                <div className="data-card-head">
                  <h3>{usuario.nombre}</h3>
                  <span className={`badge badge-${usuario.rol}`}>
                    {rolLabel[usuario.rol] || usuario.rol}
                  </span>
                </div>
                <p className="data-line">
                  <span>Email</span>
                  <strong>{usuario.email}</strong>
                </p>
                <p className="data-line">
                  <span>Teléfono</span>
                  <strong>{usuario.telefono || '—'}</strong>
                </p>
                <p className="data-line">
                  <span>Estado</span>
                  <span className={`badge badge-${usuario.estado}`}>
                    {usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </p>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEdit(usuario)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${usuario.estado === 'activo' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => toggleEstado(usuario)}
                    disabled={togglingId === usuario.id || (esMiUsuario && usuario.estado === 'activo')}
                    title={
                      esMiUsuario && usuario.estado === 'activo'
                        ? 'No puedes desactivar tu propio usuario'
                        : undefined
                    }
                  >
                    {togglingId === usuario.id
                      ? 'Guardando...'
                      : usuario.estado === 'activo'
                        ? 'Desactivar'
                        : 'Activar'}
                  </button>
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
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
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
              placeholder="Ej. Juan Vendedor"
              required
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Email *</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="usuario@electro.com"
                required
              />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Ej. 8888-0000"
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Rol *</span>
              <select name="rol" value={form.rol} onChange={handleChange}>
                <option value="vendedor">Vendedor</option>
                <option value="dueno">Dueño</option>
              </select>
            </label>
            {editing && (
              <label className="field">
                <span>Estado</span>
                <select name="estado" value={form.estado} onChange={handleChange}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
            )}
          </div>

          <label className="field">
            <span>{editing ? 'Nueva contraseña' : 'Contraseña *'}</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={editing ? 'Dejar en blanco para mantener la actual' : 'Mínimo 6 caracteres'}
              minLength={6}
              autoComplete="new-password"
              required={!editing}
            />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
