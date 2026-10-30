import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ProtectedRoute, RoleGate } from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clientes from './pages/Clientes.jsx';
import Productos from './pages/Productos.jsx';
import Ventas from './pages/Ventas.jsx';
import VentaDetalle from './pages/VentaDetalle.jsx';
import Usuarios from './pages/Usuarios.jsx';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.rol === 'dueno' ? '/dashboard' : '/ventas'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<HomeRedirect />} />
          <Route
            path="/dashboard"
            element={
              <RoleGate roles={['dueno']}>
                <Dashboard />
              </RoleGate>
            }
          />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/ventas/:id" element={<VentaDetalle />} />
          <Route
            path="/usuarios"
            element={
              <RoleGate roles={['dueno']}>
                <Usuarios />
              </RoleGate>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
