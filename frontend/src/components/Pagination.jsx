export default function Pagination({ pagination, onPageChange, disabled = false }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="pagination">
      <span className="pagination-info">
        Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={disabled || !pagination.hasPrev}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={disabled || !pagination.hasNext}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
