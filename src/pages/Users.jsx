import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useApiRequest } from '../hooks/useApiRequest';
import { auth } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['ADMIN', 'FINANCE', 'VIEWER'];

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, loading, error, refetch } = useApiRequest(() => auth.listUsers(), []);
  const [showNewUser, setShowNewUser] = useState(false);

  return (
    <Layout title="Users">
      <div className="page-section">
        <div className="page-section-header">
          <h2>Users</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewUser(true)}>
            + New User
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading users…</div>
        ) : (
          <DataTable
            rows={users}
            emptyMessage="No users yet."
            columns={[
              { key: 'name', label: 'Name', render: (u) => u.name || '—' },
              { key: 'email', label: 'Email' },
              {
                key: 'role',
                label: 'Role',
                render: (u) => (
                  <select
                    className="field-input"
                    style={{ width: 'auto' }}
                    value={u.role}
                    disabled={u.id === currentUser?.id}
                    onChange={async (e) => {
                      await auth.setRole(u.id, e.target.value);
                      refetch();
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ),
              },
              {
                key: 'active',
                label: 'Status',
                render: (u) => (
                  <span className={`chip chip-${u.active ? 'positive' : 'neutral'}`}>{u.active ? 'Active' : 'Deactivated'}</span>
                ),
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (u) =>
                  u.id === currentUser?.id ? null : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        await auth.setActive(u.id, !u.active);
                        refetch();
                      }}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  ),
              },
            ]}
          />
        )}
      </div>

      {showNewUser && (
        <NewUserModal
          onClose={() => setShowNewUser(false)}
          onCreated={() => {
            setShowNewUser(false);
            refetch();
          }}
        />
      )}
    </Layout>
  );
}

function NewUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await auth.createUser(form);
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New User" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="user-name">Name</label>
          <input id="user-name" className="field-input" value={form.name} onChange={update('name')} />
        </div>
        <div>
          <label className="field-label" htmlFor="user-email">Email</label>
          <input id="user-email" type="email" required className="field-input" value={form.email} onChange={update('email')} />
        </div>
        <div>
          <label className="field-label" htmlFor="user-password">Password</label>
          <input
            id="user-password"
            type="password"
            required
            minLength={8}
            className="field-input"
            value={form.password}
            onChange={update('password')}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="user-role">Role</label>
          <select id="user-role" className="field-input" value={form.role} onChange={update('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
