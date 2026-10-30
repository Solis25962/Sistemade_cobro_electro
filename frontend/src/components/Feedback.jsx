import Icon from './Icon.jsx';

export function Loader({ label = 'Cargando información...' }) {
  return (
    <div className="page-loader">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function Alert({ type = 'info', children, onClose }) {
  if (!children) return null;

  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name="alert" size={18} />
      <div className="alert-content">{children}</div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Cerrar aviso">
          ×
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="box" size={24} />
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}
