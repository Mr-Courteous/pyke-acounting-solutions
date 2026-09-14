import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import { useProjectProfitability } from '../hooks/useProjects';
import { formatMoney } from '../utils/format';

export default function ProjectDetail() {
  const { id } = useParams();
  const { data, loading, error } = useProjectProfitability(id);

  return (
    <Layout title={data ? `${data.code} — ${data.name}` : 'Project'}>
      {loading && <div className="page-loading">Loading project…</div>}
      {error && <div className="error-banner">{error}</div>}

      {data && (
        <>
          <div className="stat-grid">
            <StatCard label="Budget" value={formatMoney(data.budgetAmount)} />
            <StatCard label="Revenue billed" value={formatMoney(data.revenue.totalBilled)} />
            <StatCard label="Total cost" value={formatMoney(data.cost.totalCost)} tone="pending" />
            <StatCard
              label="Margin"
              value={formatMoney(data.margin)}
              tone={data.margin >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="page-section">
            <div className="page-section-header">
              <h2>Phases</h2>
            </div>
            <DataTable
              rows={data.phases}
              emptyMessage="No phases added yet."
              columns={[
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'budgetAmount', label: 'Budget', align: 'right', render: (p) => formatMoney(p.budgetAmount) },
                {
                  key: 'internalCost',
                  label: 'Internal cost',
                  align: 'right',
                  render: (p) => formatMoney(p.internalCost),
                },
                {
                  key: 'variance',
                  label: 'Variance',
                  align: 'right',
                  render: (p) => (
                    <span className={p.variance >= 0 ? 'mono' : 'mono'} style={{ color: p.variance >= 0 ? 'var(--ledger-green)' : 'var(--signal-red)' }}>
                      {formatMoney(p.variance)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}
    </Layout>
  );
}
