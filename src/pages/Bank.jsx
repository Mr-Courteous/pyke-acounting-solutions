import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import StatusChip from '../components/StatusChip';
import Modal from '../components/Modal';
import { useBankAccounts, useBankTransactions } from '../hooks/useBank';
import { bank } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const STATUS_TABS = [undefined, 'UNMATCHED', 'MATCHED', 'IGNORED'];

export default function Bank() {
  const { data: accounts } = useBankAccounts();
  const [bankAccountId, setBankAccountId] = useState(undefined);
  const [status, setStatus] = useState(undefined);
  const { data: transactions, loading, error, refetch } = useBankTransactions({ bankAccountId, status });
  const [matching, setMatching] = useState(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMatchNote, setAutoMatchNote] = useState('');

  async function handleAutoMatch() {
    if (!bankAccountId) return;
    setAutoMatching(true);
    setAutoMatchNote('');
    try {
      const result = await bank.autoMatch(bankAccountId);
      const matchedCount = Array.isArray(result) ? result.filter((r) => r.status === 'MATCHED').length : 0;
      setAutoMatchNote(`Auto-match matched ${matchedCount} transaction${matchedCount === 1 ? '' : 's'}.`);
      refetch();
    } catch (err) {
      setAutoMatchNote(err.message);
    } finally {
      setAutoMatching(false);
    }
  }

  return (
    <Layout title="Bank">
      {accounts && accounts.length > 0 && (
        <div className="stat-grid">
          {accounts.map((a) => (
            <StatCard
              key={a.id}
              label={`${a.name}${a.bankName ? ` — ${a.bankName}` : ''}`}
              value={formatMoney(a.openingBalance, a.currency)}
              sub="Opening balance — see General Ledger for the live Cash & Bank balance"
            />
          ))}
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
          {accounts && accounts.length > 1 && (
            <select
              className="field-input"
              style={{ marginLeft: 'auto', width: 'auto' }}
              value={bankAccountId || ''}
              onChange={(e) => setBankAccountId(e.target.value || undefined)}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: accounts && accounts.length > 1 ? 'var(--space-2)' : 'auto' }}
            disabled={!bankAccountId || autoMatching}
            title={!bankAccountId ? 'Pick a single account above to auto-match' : undefined}
            onClick={handleAutoMatch}
          >
            {autoMatching ? 'Matching…' : 'Auto-match'}
          </button>
        </div>

        {autoMatchNote && <div style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--ink-soft)' }}>{autoMatchNote}</div>}
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading transactions…</div>
        ) : (
          <DataTable
            rows={transactions}
            emptyMessage="No statement lines in this status."
            columns={[
              { key: 'date', label: 'Date', render: (t) => formatDate(t.date) },
              { key: 'description', label: 'Description' },
              { key: 'amount', label: 'Amount', align: 'right', render: (t) => formatMoney(t.amount, t.currency) },
              { key: 'status', label: 'Status', render: (t) => <StatusChip status={t.status} /> },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (t) => {
                  if (t.status === 'UNMATCHED') {
                    return (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setMatching(t)}>
                          Match
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={async () => {
                            await bank.ignore(t.id);
                            refetch();
                          }}
                        >
                          Ignore
                        </button>
                      </div>
                    );
                  }
                  if (t.status === 'MATCHED') {
                    return (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={async () => {
                          await bank.unmatch(t.id);
                          refetch();
                        }}
                      >
                        Unmatch
                      </button>
                    );
                  }
                  return null;
                },
              },
            ]}
          />
        )}
      </div>

      {matching && (
        <MatchModal
          transaction={matching}
          onClose={() => setMatching(null)}
          onMatched={() => {
            setMatching(null);
            refetch();
          }}
        />
      )}
    </Layout>
  );
}

function MatchModal({ transaction, onClose, onMatched }) {
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    bank
      .candidates(transaction.id)
      .then(setCandidates)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction.id]);

  async function pick(lineId) {
    setSubmittingId(lineId);
    setError('');
    try {
      await bank.match(transaction.id, lineId);
      onMatched();
    } catch (err) {
      setError(err.message);
      setSubmittingId(null);
    }
  }

  return (
    <Modal title={`Match — ${transaction.description}`} onClose={onClose}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-soft)', marginTop: 0 }}>
        Statement line: {formatDate(transaction.date)} · {formatMoney(transaction.amount, transaction.currency)}
      </p>

      {error && <div className="error-banner">{error}</div>}

      {candidates === null ? (
        <div className="page-loading">Loading candidate GL lines…</div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">No unmatched GL lines on this account to pair it with.</div>
      ) : (
        <DataTable
          rows={candidates}
          columns={[
            { key: 'entryNumber', label: 'Entry', render: (c) => c.entryNumber || c.journalEntryId.slice(0, 8) },
            { key: 'date', label: 'Date', render: (c) => formatDate(c.date) },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount', align: 'right', render: (c) => formatMoney(c.amount) },
            {
              key: 'pick',
              label: '',
              align: 'right',
              render: (c) => (
                <button type="button" className="btn btn-primary" disabled={submittingId === c.id} onClick={() => pick(c.id)}>
                  {submittingId === c.id ? 'Matching…' : 'Pick'}
                </button>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
