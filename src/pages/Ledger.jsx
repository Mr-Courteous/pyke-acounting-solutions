import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { useAccountBalances, useTrialBalance, useJournalEntries } from '../hooks/useLedger';
import { gl } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

export default function Ledger() {
  const { data: accounts, loading: accountsLoading, error: accountsError } = useAccountBalances();
  const { data: trialBalance, refetch: refetchTrialBalance } = useTrialBalance();
  const { data: entries, loading: entriesLoading, error: entriesError, refetch: refetchEntries } = useJournalEntries();
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const selected = entries?.find((e) => e.id === selectedId);

  function reload() {
    refetchEntries();
    refetchTrialBalance();
  }

  return (
    <Layout title="General Ledger">
      {trialBalance && (
        <div className="stat-grid">
          <StatCard label="Total debits" value={formatMoney(trialBalance.totalDebit)} />
          <StatCard label="Total credits" value={formatMoney(trialBalance.totalCredit)} />
          <StatCard
            label="Out of balance by"
            value={formatMoney(trialBalance.outOfBalanceBy)}
            tone={trialBalance.outOfBalanceBy === 0 ? 'positive' : 'negative'}
          />
        </div>
      )}

      <div className="page-section">
        <div className="page-section-header">
          <h2>Chart of accounts</h2>
        </div>
        {accountsError && <div className="error-banner">{accountsError}</div>}
        {accountsLoading ? (
          <div className="page-loading">Loading accounts…</div>
        ) : (
          <DataTable
            rows={accounts}
            emptyMessage="No accounts."
            columns={[
              { key: 'code', label: 'Code', render: (a) => a.account.code },
              { key: 'name', label: 'Name', render: (a) => a.account.name },
              { key: 'type', label: 'Type', render: (a) => a.account.type },
              { key: 'balance', label: 'Balance', align: 'right', render: (a) => formatMoney(a.balance) },
            ]}
          />
        )}
      </div>

      <div className="page-section">
        <div className="page-section-header">
          <h2>Journal entries</h2>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewEntry(true)}>
            + New Journal Entry
          </button>
        </div>
        {entriesError && <div className="error-banner">{entriesError}</div>}
        {entriesLoading ? (
          <div className="page-loading">Loading entries…</div>
        ) : (
          <DataTable
            rows={entries}
            emptyMessage="No journal entries yet."
            onRowClick={(e) => setSelectedId(e.id)}
            columns={[
              { key: 'entryNumber', label: 'Entry', render: (e) => e.entryNumber || e.id.slice(0, 8) },
              { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
              { key: 'description', label: 'Description' },
              { key: 'sourceType', label: 'Source' },
              {
                key: 'amount',
                label: 'Amount',
                align: 'right',
                render: (e) => formatMoney(e.lines?.reduce((s, l) => s + (Number(l.debit) || 0), 0)),
              },
            ]}
          />
        )}
      </div>

      {selected && (
        <EntryDetail
          entry={selected}
          onClose={() => setSelectedId(null)}
          onReversed={() => {
            setSelectedId(null);
            reload();
          }}
        />
      )}

      {showNewEntry && (
        <NewEntryModal
          accounts={accounts}
          onClose={() => setShowNewEntry(false)}
          onCreated={() => {
            setShowNewEntry(false);
            reload();
          }}
        />
      )}
    </Layout>
  );
}

function EntryDetail({ entry, onClose, onReversed }) {
  const [reversing, setReversing] = useState(false);
  const [error, setError] = useState('');

  async function handleReverse() {
    setReversing(true);
    setError('');
    try {
      await gl.reverseEntry(entry.id, {});
      onReversed();
    } catch (err) {
      setError(err.message);
      setReversing(false);
    }
  }

  return (
    <Modal title={entry.entryNumber || entry.id.slice(0, 8)} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-soft)', marginTop: 0 }}>
        {formatDate(entry.date)} · {entry.sourceType} · {entry.description}
      </p>
      <DataTable
        rows={entry.lines}
        columns={[
          { key: 'account', label: 'Account', render: (l) => `${l.account.code} — ${l.account.name}` },
          { key: 'debit', label: 'Debit', align: 'right', render: (l) => (l.debit ? formatMoney(l.debit) : '') },
          { key: 'credit', label: 'Credit', align: 'right', render: (l) => (l.credit ? formatMoney(l.credit) : '') },
        ]}
      />
      <div className="modal-form-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        {entry.sourceType !== 'REVERSAL' && !entry.reversedBy && (
          <button type="button" className="btn btn-secondary" disabled={reversing} onClick={handleReverse}>
            {reversing ? 'Reversing…' : 'Reverse entry'}
          </button>
        )}
      </div>
    </Modal>
  );
}

function NewEntryModal({ accounts, onClose, onCreated }) {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([
    { accountCode: '', side: 'debit', amount: '', description: '' },
    { accountCode: '', side: 'credit', amount: '', description: '' },
  ]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + (l.side === 'debit' ? Number(l.amount) || 0 : 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.side === 'credit' ? Number(l.amount) || 0 : 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  function updateLine(idx, field) {
    return (e) => {
      const { value } = e.target;
      setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
  }
  function addLine() {
    setLines((rows) => [...rows, { accountCode: '', side: 'debit', amount: '', description: '' }]);
  }
  function removeLine(idx) {
    setLines((rows) => rows.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!balanced) {
      setError(`Entry is not balanced: debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}.`);
      return;
    }
    setSubmitting(true);
    try {
      await gl.createEntry({
        date,
        description,
        lines: lines.map((l) => ({
          accountCode: l.accountCode,
          debit: l.side === 'debit' ? Number(l.amount) : undefined,
          credit: l.side === 'credit' ? Number(l.amount) : undefined,
          description: l.description || undefined,
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Journal Entry" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="entry-date">Date</label>
            <input id="entry-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="entry-description">Description</label>
            <input
              id="entry-description"
              required
              className="field-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="field-label">
            Lines — debits {formatMoney(totalDebit)} / credits {formatMoney(totalCredit)}
            {balanced ? ' (balanced)' : ''}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {lines.map((line, idx) => (
              <div key={idx} className="line-item-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr auto' }}>
                <select className="field-input" required value={line.accountCode} onChange={updateLine(idx, 'accountCode')}>
                  <option value="">Account…</option>
                  {(accounts || []).map((a) => (
                    <option key={a.account.code} value={a.account.code}>
                      {a.account.code} — {a.account.name}
                    </option>
                  ))}
                </select>
                <select className="field-input" value={line.side} onChange={updateLine(idx, 'side')}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
                <input
                  className="field-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Amount"
                  value={line.amount}
                  onChange={updateLine(idx, 'amount')}
                />
                <button
                  type="button"
                  className="line-item-remove"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 2}
                  aria-label="Remove line"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--space-2)' }} onClick={addLine}>
            + Add line
          </button>
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !balanced}>
            {submitting ? 'Posting…' : 'Post entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
