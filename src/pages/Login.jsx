import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth as authApi, setToken } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'bootstrap'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'bootstrap') {
        const { token } = await authApi.bootstrapAdmin(email, password, name);
        setToken(token);
        window.location.href = '/'; // full reload so AuthProvider picks up the new session
      } else {
        await login(email, password);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark">MBS</div>
        <h1 className="login-title">MBS-Bridge</h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'Sign in to the ledger.' : 'No account exists yet — set up the first administrator.'}
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'bootstrap' && (
            <div>
              <label className="field-label" htmlFor="name">Name</label>
              <input
                id="name"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create administrator'}
          </button>
        </form>

        <button
          type="button"
          className="login-mode-toggle"
          onClick={() => {
            setMode(mode === 'login' ? 'bootstrap' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Setting this up for the first time?' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
