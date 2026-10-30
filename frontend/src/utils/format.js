export const formatMoney = (value) =>
  `C$ ${Number(value || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export const formatDate = (value) => {
  if (!value) return '—';

  const date =
    typeof value === 'string' && value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const frecuenciaLabel = (value) =>
  ({ semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' })[value] || value;

export const estadoLabel = (value) =>
  ({ activa: 'Activa', pagada: 'Pagada', cancelada: 'Cancelada' })[value] || value;

export const metodoPagoLabel = (value) =>
  ({ efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' })[value] || value;

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const todayInput = () => new Date().toISOString().slice(0, 10);
