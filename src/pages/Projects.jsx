import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusChip from '../components/StatusChip';
import Modal from '../components/Modal';
import { useProjects } from '../hooks/useProjects';
import { useContacts } from '../hooks/useContacts';
import { projects as projectsApi } from '../api/client';
import { formatMoney } from '../utils/format';

const STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export default function Projects() {
  const { data: projects, loading, error, refetch } = useProjects();
  const [showNewProject, setShowNewProject] = useState(false);
  const navigate = useNavigate();

  return (
    <Layout title="Projects">
      <div className="page-section">
        <div className="page-section-header">
          <h2>Projects</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewProject(true)}>
            + New Project
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading projects…</div>
        ) : (
          <DataTable
            rows={projects}
            emptyMessage="No projects yet."
            onRowClick={(p) => navigate(`/projects/${p.id}`)}
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'contact', label: 'Customer', render: (p) => p.contact?.name || '—' },
              { key: 'budgetAmount', label: 'Budget', align: 'right', render: (p) => formatMoney(p.budgetAmount) },
              { key: 'status', label: 'Status', render: (p) => <StatusChip status={p.status} /> },
            ]}
          />
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => {
            setShowNewProject(false);
            refetch();
          }}
        />
      )}
    </Layout>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const { data: customers } = useContacts({ type: 'CUSTOMER' });
  const [form, setForm] = useState({
    name: '',
    code: '',
    status: 'PLANNING',
    budgetAmount: '',
    startDate: '',
    endDate: '',
    contactId: '',
  });
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
      await projectsApi.create({
        name: form.name,
        code: form.code || undefined,
        status: form.status,
        budgetAmount: form.budgetAmount ? Number(form.budgetAmount) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        contactId: form.contactId || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Project" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="proj-name">Name</label>
            <input id="proj-name" required className="field-input" value={form.name} onChange={update('name')} />
          </div>
          <div>
            <label className="field-label" htmlFor="proj-code">Code (optional — auto-generated)</label>
            <input id="proj-code" className="field-input" value={form.code} onChange={update('code')} />
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="proj-status">Status</label>
            <select id="proj-status" className="field-input" value={form.status} onChange={update('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="proj-budget">Budget (optional)</label>
            <input
              id="proj-budget"
              type="number"
              step="0.01"
              min="0"
              className="field-input"
              value={form.budgetAmount}
              onChange={update('budgetAmount')}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="proj-customer">Customer (optional)</label>
          <select id="proj-customer" className="field-input" value={form.contactId} onChange={update('contactId')}>
            <option value="">— None —</option>
            {(customers || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="proj-start">Start date (optional)</label>
            <input id="proj-start" type="date" className="field-input" value={form.startDate} onChange={update('startDate')} />
          </div>
          <div>
            <label className="field-label" htmlFor="proj-end">End date (optional)</label>
            <input id="proj-end" type="date" className="field-input" value={form.endDate} onChange={update('endDate')} />
          </div>
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
