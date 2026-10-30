import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';
import Icon from './Icon.jsx';

const navItems = [
  { to: '/dashboard', label: 'Panel', icon: 'dashboard', ownerOnly: true },
  { to: '/ventas', label: 'Ventas', icon: 'receipt' },
  { to: '/clientes', label: 'Clientes', icon: 'users' },
  { to: '/productos', label: 'Productos', icon: 'box' },
  { to: '/usuarios', label: 'Usuarios', icon: 'shield', ownerOnly: true }
];

export default function Layout() {
  const { user, logout, isOwner } = useAuth();
  const navigate = useNavigate();

  const items = navItems.filter((item) => !item.ownerOnly || isOwner);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CE</div>
          <div>
            <strong>Cobro Electro</strong>
            <span>Ventas casa a casa</span>
          </div>
        </div>

        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <Icon name={item.icon} size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{initials(user?.nombre)}</span>
            <div>
              <strong>{user?.nombre}</strong>
              <span>{isOwner ? 'Dueño' : 'Vendedor'}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="mobile-topbar">
          <div className="brand">
            <div className="brand-mark">CE</div>
            <div>
              <strong>Cobro Electro</strong>
              <span>{isOwner ? 'Dueño' : 'Vendedor'}</span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={handleLogout} aria-label="Cerrar sesión">
            <Icon name="logout" size={20} />
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
