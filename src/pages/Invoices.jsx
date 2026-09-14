import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusChip from '../components/StatusChip';
import Modal from '../components/Modal';
import { useInvoices } from '../hooks/useInvoices';
import { invoices as invoicesApi } from '../api/client';
import { formatMoney } from '../utils/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

const RETRYABLE = ['REJECTED', 'NRS_REJECTED', 'ERROR'];

export default function Invoices() {
  const { data: invoices, loading, error, refetch } = useInvoices();
  const [selectedId, setSelectedId] = useState(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const selected = invoices?.find((i) => i.id === selectedId);

  return (
    <Layout title="Invoices">
      <div className="page-section">
        <div className="page-section-header">
          <h2>NRS e-invoicing pipeline</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewInvoice(true)}>
            + New Invoice
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading invoices…</div>
        ) : (
          <DataTable
            rows={invoices}
            emptyMessage="Waiting for the first invoice to arrive…"
            onRowClick={(inv) => setSelectedId(inv.id)}
            columns={[
              {
                key: 'invoiceNumber',
                label: 'Invoice',
                render: (inv) => inv.mapped?.invoiceMeta?.invoiceNumber || inv.raw?.invoiceNumber || inv.id.slice(0, 8),
              },
              { key: 'buyer', label: 'Buyer', render: (inv) => inv.mapped?.buyer?.name || '—' },
              { key: 'sourceSystem', label: 'Source' },
              {
                key: 'total',
                label: 'Total',
                align: 'right',
                render: (inv) => formatMoney(inv.mapped?.totals?.grandTotal, inv.mapped?.invoiceMeta?.currency),
              },
              { key: 'status', label: 'Status', render: (inv) => <StatusChip status={inv.status} /> },
            ]}
          />
        )}
      </div>

      {selected && (
        <InvoiceDetail
          invoice={selected}
          onClose={() => setSelectedId(null)}
          onRetried={() => {
            refetch();
          }}
        />
      )}

      {showNewInvoice && (
        <NewInvoiceModal
          onClose={() => setShowNewInvoice(false)}
          onCreated={() => {
            setShowNewInvoice(false);
            refetch();
          }}
        />
      )}
    </Layout>
  );
}

function InvoiceDetail({ invoice, onClose, onRetried }) {
  const m = invoice.mapped;
  const errors = invoice.errors || (invoice.rejectionReason ? [invoice.rejectionReason] : []) || (invoice.errorMessage ? [invoice.errorMessage] : []);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  async function handleRetry() {
    setRetrying(true);
    setRetryError('');
    try {
      await invoicesApi.retry(invoice.id);
      onRetried();
    } catch (err) {
      setRetryError(err.message);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>{m?.invoiceMeta?.invoiceNumber || invoice.id.slice(0, 8)}</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {RETRYABLE.includes(invoice.status) && (
            <button type="button" className="btn btn-primary" disabled={retrying} onClick={handleRetry}>
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div style={{ padding: 'var(--space-4)' }}>
        {retryError && <div className="error-banner">{retryError}</div>}
        {errors.length > 0 && (
          <div className="error-banner">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        {m && (
          <dl
            className="mono"
            style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
          >
            <dt style={{ color: 'var(--ink-soft)' }}>Supplier</dt>
            <dd style={{ margin: 0 }}>{m.supplier.name} ({m.supplier.tin})</dd>
            <dt style={{ color: 'var(--ink-soft)' }}>Buyer</dt>
            <dd style={{ margin: 0 }}>{m.buyer.name} ({m.buyer.tin})</dd>
            <dt style={{ color: 'var(--ink-soft)' }}>Grand total</dt>
            <dd style={{ margin: 0 }}>{formatMoney(m.totals.grandTotal, m.invoiceMeta.currency)}</dd>
          </dl>
        )}

        {invoice.irn && (
          <p className="mono" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-4)' }}>
            IRN: {invoice.irn}
          </p>
        )}

        {invoice.qr?.dataUrl && (
          <img src={invoice.qr.dataUrl} width={110} height={110} alt="Invoice QR code" style={{ marginTop: 'var(--space-4)' }} />
        )}
      </div>
    </div>
  );
}

function NewInvoiceModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    invoiceNumber: '',
    supplierName: '',
    supplierTin: '',
    supplierAddress: '',
    supplierEmail: '',
    buyerName: '',
    buyerTin: '',
    buyerAddress: '',
    currency: 'NGN',
    issueDate: todayIso(),
    dueDate: '',
  });
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }
  function updateItem(idx, field) {
    return (e) => {
      const { value } = e.target;
      setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
  }
  function addItem() {
    setItems((rows) => [...rows, { description: '', quantity: 1, unitPrice: '' }]);
  }
  function removeItem(idx) {
    setItems((rows) => rows.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await invoicesApi.createManual({
        invoiceNumber: form.invoiceNumber || undefined,
        supplierName: form.supplierName,
        supplierTin: form.supplierTin,
        supplierAddress: form.supplierAddress,
        supplierEmail: form.supplierEmail,
        buyerName: form.buyerName,
        buyerTin: form.buyerTin,
        buyerAddress: form.buyerAddress,
        currency: form.currency,
        issueDate: form.issueDate || undefined,
        dueDate: form.dueDate || undefined,
        items: items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
        })),
      });

      if (result?.status === 'REJECTED') {
        setError((result.errors || ['Invoice was rejected — check the required fields.']).join(' · '));
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Invoice" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="inv-number">Invoice number (optional)</label>
            <input id="inv-number" className="field-input" value={form.invoiceNumber} onChange={update('invoiceNumber')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-currency">Currency</label>
            <input id="inv-currency" className="field-input" value={form.currency} onChange={update('currency')} />
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="inv-supplier-name">Supplier (your business) name</label>
            <input id="inv-supplier-name" required className="field-input" value={form.supplierName} onChange={update('supplierName')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-supplier-tin">Supplier TIN</label>
            <input id="inv-supplier-tin" required className="field-input" value={form.supplierTin} onChange={update('supplierTin')} />
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="inv-supplier-address">Supplier address</label>
            <input id="inv-supplier-address" required className="field-input" value={form.supplierAddress} onChange={update('supplierAddress')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-supplier-email">Supplier email</label>
            <input id="inv-supplier-email" type="email" required className="field-input" value={form.supplierEmail} onChange={update('supplierEmail')} />
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="inv-buyer-name">Buyer (customer) name</label>
            <input id="inv-buyer-name" required className="field-input" value={form.buyerName} onChange={update('buyerName')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-buyer-tin">Buyer TIN</label>
            <input id="inv-buyer-tin" required className="field-input" value={form.buyerTin} onChange={update('buyerTin')} />
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="inv-buyer-address">Buyer address</label>
            <input id="inv-buyer-address" required className="field-input" value={form.buyerAddress} onChange={update('buyerAddress')} />
          </div>
          <div></div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="inv-issue-date">Issue date</label>
            <input id="inv-issue-date" type="date" className="field-input" value={form.issueDate} onChange={update('issueDate')} />
          </div>
          <div>
            <label className="field-label" htmlFor="inv-due-date">Due date (optional)</label>
            <input id="inv-due-date" type="date" className="field-input" value={form.dueDate} onChange={update('dueDate')} />
          </div>
        </div>

        <div>
          <label className="field-label">Line items</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {items.map((item, idx) => (
              <div key={idx} className="line-item-row">
                <input
                  className="field-input"
                  placeholder="Description"
                  required
                  value={item.description}
                  onChange={updateItem(idx, 'description')}
                />
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={updateItem(idx, 'quantity')}
                />
                <input
                  className="field-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Unit price"
                  required
                  value={item.unitPrice}
                  onChange={updateItem(idx, 'unitPrice')}
                />
                <button
                  type="button"
                  className="line-item-remove"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  aria-label="Remove line item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--space-2)' }} onClick={addItem}>
            + Add line item
          </button>
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
