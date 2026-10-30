import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Alert, EmptyState, Loader } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import {
  estadoLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  frecuenciaLabel,
  metodoPagoLabel
} from '../utils/format.js';

function Info({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

export default function VentaDetalle() {
  const { id } = useParams();
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const { data: venta, loading, error, reload } = useFetch(`/ventas/${id}`);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ monto: '', metodo_pago: 'efectivo', notas: '' });
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(null);
  const [deletingAbonoId, setDeletingAbonoId] = useState(null);
  const [deletingSale, setDeletingSale] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesForm, setNotesForm] = useState('');
  const [notesError, setNotesError] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="page">
        <PageHeader backTo="/ventas" title={`Venta #${id}`} />
        <Alert type="error">{error}</Alert>
      </div>
    );
  }

  if (!venta) return null;

  const total = Number(venta.precio_total);
  const saldo = Number(venta.saldo_pendiente);
  const pagado = Math.max(total - saldo, 0);
  const porcentaje = total > 0 ? Math.min((pagado / total) * 100, 100) : 0;
  const abonos = venta.abonos || [];

  const openAbonoModal = () => {
    const sugerido = Math.min(Number(venta.monto_cuota), saldo);
    setForm({
      monto: sugerido > 0 ? String(sugerido) : '',
      metodo_pago: 'efectivo',
      notas: ''
    });
    setFormError('');
    setActionError('');
    setModalOpen(true);
  };

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const monto = Number(form.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      setFormError('El monto debe ser mayor que cero');
      return;
    }

    if (monto > saldo) {
      setFormError(`El abono no puede superar el saldo pendiente (${formatMoney(saldo)})`);
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const response = await api.post('/abonos', {
        venta_id: Number(venta.id),
        monto,
        metodo_pago: form.metodo_pago,
        notas: form.notas || null
      });

      setModalOpen(false);
      setReceipt({
        url: response.whatsapp_url,
        monto: response.data.monto,
        saldo: response.data.saldo_pendiente,
        recibo: response.data.numero_recibo
      });
      await reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openReceipt = async (abonoId) => {
    setReceiptLoading(abonoId);
    setActionError('');

    try {
      const response = await api.get(`/abonos/${abonoId}/recibo`);

      if (response.whatsapp_url) {
        window.open(response.whatsapp_url, '_blank', 'noopener,noreferrer');
      } else {
        setActionError('El cliente no tiene un teléfono registrado para enviar el recibo.');
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setReceiptLoading(null);
    }
  };

  const handleDeleteAbono = async (abono) => {
    if (
      !window.confirm(
        `¿Eliminar el abono ${abono.numero_recibo || `#${abono.id}`}? El saldo de la venta se restaurará.`
      )
    ) {
      return;
    }

    setDeletingAbonoId(abono.id);
    setActionError('');

    try {
      await api.del(`/abonos/${abono.id}`);
      setReceipt(null);
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingAbonoId(null);
    }
  };

  const handleDeleteSale = async () => {
    if (
      !window.confirm(
        '¿Eliminar esta venta? Se restaurará el stock del producto. Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    setDeletingSale(true);
    setActionError('');

    try {
      await api.del(`/ventas/${venta.id}`);
      navigate('/ventas', { replace: true });
    } catch (err) {
      setActionError(err.message);
      setDeletingSale(false);
    }
  };

  const openNotes = () => {
    setNotesForm(venta.notas || '');
    setNotesError('');
    setNotesOpen(true);
  };

  const handleSaveNotes = async (event) => {
    event.preventDefault();
    setSavingNotes(true);
    setNotesError('');

    try {
      await api.patch(`/ventas/${venta.id}`, { notas: notesForm || null });
      setNotesOpen(false);
      await reload();
    } catch (err) {
      setNotesError(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        backTo="/ventas"
        title={`Venta #${venta.id}`}
        subtitle={`${venta.cliente_nombre} · ${venta.producto_nombre}`}
        actions={
          <div className="inline-actions">
            <span className={`badge badge-${venta.estado}`}>{estadoLabel(venta.estado)}</span>
            {venta.estado === 'activa' && (
              <button type="button" className="btn btn-primary" onClick={openAbonoModal}>
                <Icon name="cash" size={18} />
                Registrar abono
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={openNotes}>
              Editar notas
            </button>
            {isOwner && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteSale}
                disabled={deletingSale}
              >
                {deletingSale ? 'Eliminando...' : 'Eliminar venta'}
              </button>
            )}
          </div>
        }
      />

      {receipt && (
        <div className="receipt-banner">
          <div>
            <strong>Abono registrado: {formatMoney(receipt.monto)}</strong>
            <p>
              Recibo {receipt.recibo}. Nuevo saldo pendiente: {formatMoney(receipt.saldo)}
            </p>
          </div>
          {receipt.url ? (
            <a className="btn btn-whatsapp" href={receipt.url} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={18} />
              Enviar por WhatsApp
            </a>
          ) : (
            <span className="muted">El cliente no tiene teléfono registrado.</span>
          )}
        </div>
      )}

      <Alert type="error" onClose={() => setActionError('')}>
        {actionError}
      </Alert>

      <section className="card sale-summary">
        <div className="sale-summary-head">
          <div>
            <h2>{venta.cliente_nombre}</h2>
            <p className="muted">
              {venta.cliente_telefono || 'Sin teléfono'} · {venta.cliente_direccion || 'Sin dirección'}
            </p>
          </div>
          <div className="sale-balance">
            <span>Saldo pendiente</span>
            <strong className={saldo > 0 ? 'text-warning' : 'text-ok'}>{formatMoney(saldo)}</strong>
          </div>
        </div>

        <div className="progress progress-large">
          <span style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="muted progress-caption">
          {formatMoney(pagado)} pagados de {formatMoney(total)} ({Math.round(porcentaje)}%)
        </p>
      </section>

      <section className="detail-grid">
        <Info label="Producto" value={venta.producto_nombre} />
        <Info label="Precio total" value={formatMoney(venta.precio_total)} />
        <Info label="Monto de cuota" value={formatMoney(venta.monto_cuota)} />
        <Info label="Frecuencia" value={frecuenciaLabel(venta.frecuencia)} />
        <Info label="Total de cuotas" value={venta.total_cuotas} />
        <Info label="Fecha de inicio" value={formatDate(venta.fecha_inicio)} />
        <Info label="Vendedor" value={venta.vendedor_nombre} />
        <Info label="Estado" value={estadoLabel(venta.estado)} />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Notas de la venta</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={openNotes}>
            Editar
          </button>
        </div>
        <p className={venta.notas ? 'note' : 'muted'}>
          {venta.notas || 'Sin notas registradas.'}
        </p>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Historial de abonos</h2>
          <span className="muted">{abonos.length} registros</span>
        </div>

        {abonos.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Registrado por</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {abonos.map((abono) => (
                  <tr key={abono.id}>
                    <td>{abono.numero_recibo || `#${abono.id}`}</td>
                    <td>{formatDateTime(abono.fecha_pago)}</td>
                    <td className="money">{formatMoney(abono.monto)}</td>
                    <td>{metodoPagoLabel(abono.metodo_pago)}</td>
                    <td>{abono.registrado_por_nombre || '—'}</td>
                    <td className="table-action">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openReceipt(abono.id)}
                          disabled={receiptLoading === abono.id}
                        >
                          {receiptLoading === abono.id ? 'Abriendo...' : 'Recibo'}
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteAbono(abono)}
                            disabled={deletingAbonoId === abono.id}
                          >
                            {deletingAbonoId === abono.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin abonos registrados"
            message="Cuando el cliente realice un pago, regístralo para actualizar el saldo."
          />
        )}
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar abono">
        <form className="form" onSubmit={handleSubmit}>
          <Alert type="error" onClose={() => setFormError('')}>
            {formError}
          </Alert>

          <div className="sale-summary-inline">
            <span>Saldo pendiente</span>
            <strong>{formatMoney(saldo)}</strong>
          </div>

          <label className="field">
            <span>Monto del abono (C$) *</span>
            <input
              type="number"
              name="monto"
              value={form.monto}
              onChange={handleChange}
              min="0.01"
              max={saldo}
              step="0.01"
              required
            />
          </label>

          <label className="field">
            <span>Método de pago</span>
            <select name="metodo_pago" value={form.metodo_pago} onChange={handleChange}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label className="field">
            <span>Notas</span>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows="3"
              placeholder="Comentario opcional del pago"
            />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar abono'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Notas de la venta">
        <form className="form" onSubmit={handleSaveNotes}>
          <Alert type="error" onClose={() => setNotesError('')}>
            {notesError}
          </Alert>

          <label className="field">
            <span>Notas</span>
            <textarea
              value={notesForm}
              onChange={(event) => setNotesForm(event.target.value)}
              rows="5"
              placeholder="Condiciones o comentarios de la venta"
            />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setNotesOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingNotes}>
              {savingNotes ? 'Guardando...' : 'Guardar notas'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
