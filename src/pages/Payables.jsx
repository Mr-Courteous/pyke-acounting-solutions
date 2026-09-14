import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';
import { usePayables, usePayablesSummary } from '../hooks/usePayables';
import { useProjects } from '../hooks/useProjects';
import { ap } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const STATUS_TABS = [undefined, 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID'];
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function Payables() {
  const [status, setStatus] = useState(undefined);
  const { data: bills, loading, error, refetch } = usePayables({ status });
  const { data: summary, refetch: refetchSummary } = usePayablesSummary();
  const [showNewBill, setShowNewBill] = useState(false);
  const [payingBill, setPayingBill] = useState(null);

  function reload() {
    refetch();
    refetchSummary();
  }

  return (
    <Layout title="Payables">
      {summary && (
        <div className="stat-grid">
          <StatCard label="Billed" value={formatMoney(summary.totalBilled)} />
          <StatCard label="Paid" value={formatMoney(summary.totalPaid)} tone="positive" />
          <StatCard label="Outstanding" value={formatMoney(summary.totalOutstanding)} tone="pending" />
          <StatCard label="Overdue" value={formatMoney(summary.totalOverdue)} tone="negative" />
        </div>
      )}

      <div className="page-section">
        <div className="page-section-header">
          <h2>Bills</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewBill(true)}>
            + New Bill
          </button>
        </div>

        <div className="filter-tabs">
          {STATUS_TABS.map((s) => (
            <button
              key={s || 'ALL'}
              type="button"
              className={`filter-tab${status === s ? ' filter-tab-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading bills…</div>
        ) : (
          <DataTable
            rows={bills}
            emptyMessage="No bills in this status."
            columns={[
              { key: 'billNumber', label: 'Bill' },
              { key: 'vendorName', label: 'Vendor', render: (b) => b.contact?.name || b.vendorName },
              { key: 'amount', label: 'Amount', align: 'right', render: (b) => formatMoney(b.amount, b.currency) },
              { key: 'balance', label: 'Balance', align: 'right', render: (b) => formatMoney(b.balance, b.currency) },
              { key: 'dueDate', label: 'Due', render: (b) => formatDate(b.dueDate) },
              { key: 'status', label: 'Status', render: (b) => <StatusChip status={b.status} /> },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (b) =>
                  b.status !== 'VOID' && b.balance > 0.004 ? (
                    <button type="button" className="btn btn-secondary" onClick={() => setPayingBill(b)}>
                      Record payment
                    </button>
                  ) : null,
              },
            ]}
          />
        )}
      </div>

      {showNewBill && (
        <NewBillModal
          onClose={() => setShowNewBill(false)}
          onCreated={() => {
            setShowNewBill(false);
            reload();
          }}
        />
      )}

      {payingBill && (
        <PaymentModal
          title={`Record payment — ${payingBill.billNumber}`}
          balance={payingBill.balance}
          currency={payingBill.currency}
          onClose={() => setPayingBill(null)}
          onSubmit={async (payload) => {
            await ap.applyPayment(payingBill.id, payload);
            reload();
          }}
        />
      )}
    </Layout>
  );
}

function NewBillModal({ onClose, onCreated }) {
  const { data: projects } = useProjects();
  const [form, setForm] = useState({
    billNumber: '',
    vendorName: '',
    vendorTin: '',
    amount: '',
    currency: 'NGN',
    billDate: todayIso(),
    dueDate: '',
    projectId: '',
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
      await ap.create({
        billNumber: form.billNumber,
        vendorName: form.vendorName,
        vendorTin: form.vendorTin || undefined,
        amount: Number(form.amount),
        currency: form.currency,
        billDate: form.billDate || undefined,
        dueDate: form.dueDate || undefined,
        projectId: form.projectId || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Bill" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="bill-number">Bill number</label>
            <input id="bill-number" required className="field-input" value={form.billNumber} onChange={update('billNumber')} />
          </div>
          <div>
            <label className="field-label" htmlFor="bill-currency">Currency</label>
            <input id="bill-currency" className="field-input" value={form.currency} onChange={update('currency')} />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="bill-vendor">Vendor name</label>
          <input id="bill-vendor" required className="field-input" value={form.vendorName} onChange={update('vendorName')} />
        </div>

        <div>
          <label className="field-label" htmlFor="bill-vendor-tin">Vendor TIN (optional)</label>
          <input id="bill-vendor-tin" className="field-input" value={form.vendorTin} onChange={update('vendorTin')} />
        </div>

        <div>
          <label className="field-label" htmlFor="bill-amount">Amount</label>
          <input
            id="bill-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="field-input"
            value={form.amount}
            onChange={update('amount')}
          />
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="bill-date">Bill date</label>
            <input id="bill-date" type="date" className="field-input" value={form.billDate} onChange={update('billDate')} />
          </div>
          <div>
            <label className="field-label" htmlFor="bill-due">Due date (optional — defaults net-30)</label>
            <input id="bill-due" type="date" className="field-input" value={form.dueDate} onChange={update('dueDate')} />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="bill-project">Project (optional)</label>
          <select id="bill-project" className="field-input" value={form.projectId} onChange={update('projectId')}>
            <option value="">— None —</option>
            {(projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create bill'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
