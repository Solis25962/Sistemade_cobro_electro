import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader } from './Feedback.jsx';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <Loader label="Validando sesión..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function RoleGate({ roles, children }) {
  const { user } = useAuth();

  if (roles && !roles.includes(user?.rol)) {
    return <Navigate to={user?.rol === 'dueno' ? '/dashboard' : '/ventas'} replace />;
  }

  return children;
}
