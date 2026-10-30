import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@electro.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.rol === 'dueno' ? '/dashboard' : '/ventas'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loggedUser = await login(email.trim(), password);
      const fallback = loggedUser.rol === 'dueno' ? '/dashboard' : '/ventas';
      navigate(location.state?.from || fallback, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="brand brand-login">
          <div className="brand-mark">CE</div>
          <div>
            <strong>Cobro Electro</strong>
            <span>Control de ventas y abonos</span>
          </div>
        </div>

        <div className="login-copy">
          <h1>Bienvenido de nuevo</h1>
          <p>Administra tus ventas a crédito, clientes, inventario y abonos desde un solo lugar.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>

          <label className="field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              required
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="demo-box">
          <strong>Credenciales de prueba</strong>
          <p>
            Dueño: <code>admin@electro.com</code> / <code>admin123</code>
          </p>
          <p>
            Vendedor: <code>vendedor@electro.com</code> / <code>vendedor123</code>
          </p>
        </div>
      </section>

      <aside className="login-aside">
        <div className="login-aside-content">
          <span className="eyebrow">Sistema de cobro</span>
          <h2>Tu negocio de electrodomésticos, ordenado y bajo control.</h2>
          <ul>
            <li>Registra ventas a crédito en segundos.</li>
            <li>Controla abonos y saldos automáticamente.</li>
            <li>Envía recibos digitales por WhatsApp.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
