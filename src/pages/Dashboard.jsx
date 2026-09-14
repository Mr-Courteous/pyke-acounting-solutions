import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import { useDashboard } from '../hooks/useDashboard';
import { bi } from '../api/client';
import { formatMoney } from '../utils/format';

export default function Dashboard() {
  const { data, loading, error } = useDashboard();
  const [revenue, setRevenue] = useState(null);
  const [spend, setSpend] = useState(null);

  useEffect(() => {
    bi.revenueByCustomer({ limit: 5 }).then(setRevenue).catch(() => setRevenue([]));
    bi.spendByVendor({ limit: 5 }).then(setSpend).catch(() => setSpend([]));
  }, []);

  return (
    <Layout title="Dashboard">
      {loading && <div className="page-loading">Loading dashboard…</div>}
      {error && <div className="error-banner">{error}</div>}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="Cash on hand" value={formatMoney(data.cash.balance)} sub={data.cash.accountName} />
            <StatCard
              label="Receivables outstanding"
              value={formatMoney(data.receivables.totalOutstanding)}
              tone="pending"
            />
            <StatCard label="Payables outstanding" value={formatMoney(data.payables.totalOutstanding)} tone="pending" />
            <StatCard
              label="Lifetime net income"
              value={formatMoney(data.lifetimeNetIncome)}
              tone={data.lifetimeNetIncome >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </>
      )}

      <div className="page-section">
        <div className="page-section-header">
          <h2>Top customers by revenue</h2>
        </div>
        <DataTable
          rows={revenue}
          emptyMessage="No invoiced revenue yet."
          columns={[
            { key: 'name', label: 'Customer' },
            { key: 'totalInvoiced', label: 'Invoiced', align: 'right', render: (r) => formatMoney(r.totalInvoiced) },
            { key: 'totalCollected', label: 'Collected', align: 'right', render: (r) => formatMoney(r.totalCollected) },
            {
              key: 'totalOutstanding',
              label: 'Outstanding',
              align: 'right',
              render: (r) => formatMoney(r.totalOutstanding),
            },
          ]}
        />
      </div>

      <div className="page-section">
        <div className="page-section-header">
          <h2>Top vendors by spend</h2>
        </div>
        <DataTable
          rows={spend}
          emptyMessage="No vendor bills yet."
          columns={[
            { key: 'name', label: 'Vendor' },
            { key: 'totalBilled', label: 'Billed', align: 'right', render: (r) => formatMoney(r.totalBilled) },
            { key: 'totalPaid', label: 'Paid', align: 'right', render: (r) => formatMoney(r.totalPaid) },
            {
              key: 'totalOutstanding',
              label: 'Outstanding',
              align: 'right',
              render: (r) => formatMoney(r.totalOutstanding),
            },
          ]}
        />
      </div>
    </Layout>
  );
}
