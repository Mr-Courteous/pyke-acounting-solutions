import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useContacts } from '../hooks/useContacts';
import { contacts as contactsApi } from '../api/client';

const TYPE_TABS = [undefined, 'CUSTOMER', 'VENDOR'];

export default function Contacts() {
  const [type, setType] = useState(undefined);
  const { data: contacts, loading, error, refetch } = useContacts({ type });
  const [showNewContact, setShowNewContact] = useState(false);

  return (
    <Layout title="Contacts">
      <div className="page-section">
        <div className="page-section-header">
          <h2>Contacts</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewContact(true)}>
            + New Contact
          </button>
        </div>

        <div className="filter-tabs">
          {TYPE_TABS.map((t) => (
            <button
              key={t || 'ALL'}
              type="button"
              className={`filter-tab${type === t ? ' filter-tab-active' : ''}`}
              onClick={() => setType(t)}
            >
              {t ? (t === 'CUSTOMER' ? 'Customers' : 'Vendors') : 'All'}
            </button>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading contacts…</div>
        ) : (
          <DataTable
            rows={contacts}
            emptyMessage="No contacts yet — they're also created automatically the first time an invoice or bill names one."
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              { key: 'tin', label: 'TIN', render: (c) => c.tin || '—' },
              { key: 'email', label: 'Email', render: (c) => c.email || '—' },
              { key: 'phone', label: 'Phone', render: (c) => c.phone || '—' },
            ]}
          />
        )}
      </div>

      {showNewContact && (
        <NewContactModal
          onClose={() => setShowNewContact(false)}
          onCreated={() => {
            setShowNewContact(false);
            refetch();
          }}
        />
      )}
    </Layout>
  );
}

function NewContactModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ type: 'CUSTOMER', name: '', tin: '', email: '', phone: '', address: '' });
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
      await contactsApi.create({
        type: form.type,
        name: form.name,
        tin: form.tin || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Contact" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="contact-type">Type</label>
          <select id="contact-type" className="field-input" value={form.type} onChange={update('type')}>
            <option value="CUSTOMER">Customer</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="contact-name">Name</label>
          <input id="contact-name" required className="field-input" value={form.name} onChange={update('name')} />
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="contact-tin">TIN (optional)</label>
            <input id="contact-tin" className="field-input" value={form.tin} onChange={update('tin')} />
          </div>
          <div>
            <label className="field-label" htmlFor="contact-email">Email (optional)</label>
            <input id="contact-email" type="email" className="field-input" value={form.email} onChange={update('email')} />
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="contact-phone">Phone (optional)</label>
            <input id="contact-phone" className="field-input" value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label className="field-label" htmlFor="contact-address">Address (optional)</label>
            <input id="contact-address" className="field-input" value={form.address} onChange={update('address')} />
          </div>
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
