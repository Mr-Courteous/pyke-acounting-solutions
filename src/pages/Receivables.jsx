import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import PaymentModal from '../components/PaymentModal';
import { useReceivables, useReceivablesSummary } from '../hooks/useReceivables';
import { ar } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const STATUS_TABS = [undefined, 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID'];

export default function Receivables() {
  const [status, setStatus] = useState(undefined);
  const { data: receivables, loading, error, refetch } = useReceivables({ status });
  const { data: summary, refetch: refetchSummary } = useReceivablesSummary();
  const [collecting, setCollecting] = useState(null);

  function reload() {
    refetch();
    refetchSummary();
  }

  return (
    <Layout title="Receivables">
      {summary && (
        <div className="stat-grid">
          <StatCard label="Invoiced" value={formatMoney(summary.totalInvoiced)} />
          <StatCard label="Collected" value={formatMoney(summary.totalCollected)} tone="positive" />
          <StatCard label="Outstanding" value={formatMoney(summary.totalOutstanding)} tone="pending" />
          <StatCard label="Overdue" value={formatMoney(summary.totalOverdue)} tone="negative" />
        </div>
      )}

      <div className="page-section">
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
          <div className="page-loading">Loading receivables…</div>
        ) : (
          <DataTable
            rows={receivables}
            emptyMessage="No receivables in this status — these are created automatically once an invoice on the Invoices page is confirmed."
            columns={[
              { key: 'invoiceNumber', label: 'Invoice' },
              { key: 'customerName', label: 'Customer', render: (r) => r.contact?.name || r.customerName },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount, r.currency) },
              { key: 'balance', label: 'Balance', align: 'right', render: (r) => formatMoney(r.balance, r.currency) },
              { key: 'dueDate', label: 'Due', render: (r) => formatDate(r.dueDate) },
              { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (r) =>
                  r.status !== 'VOID' && r.balance > 0.004 ? (
                    <button type="button" className="btn btn-secondary" onClick={() => setCollecting(r)}>
                      Record payment
                    </button>
                  ) : null,
              },
            ]}
          />
        )}
      </div>

      {collecting && (
        <PaymentModal
          title={`Record payment — ${collecting.invoiceNumber}`}
          balance={collecting.balance}
          currency={collecting.currency}
          onClose={() => setCollecting(null)}
          onSubmit={async (payload) => {
            await ar.applyPayment(collecting.id, payload);
            reload();
          }}
        />
      )}
    </Layout>
  );
}
