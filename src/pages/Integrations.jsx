import { useState } from 'react';
import Layout from '../components/Layout';
import { useApiRequest } from '../hooks/useApiRequest';
import { quickbooks } from '../api/client';

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthAgoIso = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function Integrations() {
  const { data: status, loading, error, refetch } = useApiRequest(() => quickbooks.status(), []);
  const [disconnecting, setDisconnecting] = useState(false);
  const [range, setRange] = useState({ from: monthAgoIso(), to: todayIso() });
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillError, setBackfillError] = useState('');

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await quickbooks.disconnect();
      refetch();
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleBackfill(e) {
    e.preventDefault();
    setBackfilling(true);
    setBackfillError('');
    setBackfillResult(null);
    try {
      const result = await quickbooks.backfill(range.from, range.to);
      setBackfillResult(result);
    } catch (err) {
      setBackfillError(err.message);
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <Layout title="Integrations">
      <div className="page-section">
        <div className="page-section-header">
          <h2>QuickBooks Online</h2>
        </div>
        <div style={{ padding: 'var(--space-4)' }}>
          {error && <div className="error-banner">{error}</div>}
          {loading ? (
            <div className="page-loading">Checking connection…</div>
          ) : (
            <>
              <p style={{ fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4)' }}>
                Status:{' '}
                <span className={`chip chip-${status?.connected ? 'positive' : 'neutral'}`}>
                  {status?.connected ? 'Connected' : 'Not connected'}
                </span>
                {!status?.configured && (
                  <span style={{ color: 'var(--ink-soft)', marginLeft: 'var(--space-3)' }}>
                    (QBO_CLIENT_ID / QBO_CLIENT_SECRET / QBO_REDIRECT_URI not set on the server yet)
                  </span>
                )}
              </p>

              {status?.connected ? (
                <button type="button" className="btn btn-secondary" disabled={disconnecting} onClick={handleDisconnect}>
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              ) : (
                <a
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                  href={quickbooks.connectUrl}
                >
                  Connect QuickBooks
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {status?.connected && (
        <div className="page-section">
          <div className="page-section-header">
            <h2>Backfill historical invoices</h2>
          </div>
          <div style={{ padding: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-soft)', marginTop: 0 }}>
              Pulls every QuickBooks invoice in this date range through the NRS pipeline — separate from the regular
              automatic poll, useful for loading history right after connecting.
            </p>
            {backfillError && <div className="error-banner">{backfillError}</div>}
            {backfillResult && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ledger-green)', marginBottom: 'var(--space-4)' }}>
                Found and processed {backfillResult.found} invoice{backfillResult.found === 1 ? '' : 's'} between{' '}
                {backfillResult.from} and {backfillResult.to}.
              </div>
            )}
            <form onSubmit={handleBackfill} className="modal-form-row" style={{ alignItems: 'end' }}>
              <div>
                <label className="field-label" htmlFor="backfill-from">From</label>
                <input
                  id="backfill-from"
                  type="date"
                  className="field-input"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="backfill-to">To</label>
                <input
                  id="backfill-to"
                  type="date"
                  className="field-input"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={backfilling}>
                {backfilling ? 'Running…' : 'Run backfill'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
