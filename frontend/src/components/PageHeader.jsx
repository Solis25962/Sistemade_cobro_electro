import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function PageHeader({ title, subtitle, actions, backTo }) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {backTo && (
          <Link to={backTo} className="back-link">
            <Icon name="back" size={17} />
            Volver
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
