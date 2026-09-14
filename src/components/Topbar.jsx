import { useAuth } from '../contexts/AuthContext';

export default function Topbar({ title, onToggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button 
          className="mobile-sidebar-toggle" 
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          ≡
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-user">
        {user && (
          <>
            <span className="topbar-user-name">{user.name || user.email}</span>
            <span className={`chip chip-neutral`}>{user.role}</span>
          </>
        )}
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
