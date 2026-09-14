import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * role (optional): if given, the signed-in user's role must match one
 * of these, or a "not authorized" message replaces the page instead of
 * a redirect (they're already logged in — the problem is permissions,
 * not the session, so bouncing to /login would be misleading).
 */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const allowed = role ? (Array.isArray(role) ? role.includes(user.role) : user.role === role) : true;
  if (!allowed) {
    return (
      <div className="page-section" style={{ margin: 'var(--space-6)' }}>
        <div className="empty-state">You don't have permission to view this page.</div>
      </div>
    );
  }

  return children;
}
