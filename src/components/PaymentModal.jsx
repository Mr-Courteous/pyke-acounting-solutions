import { useState } from 'react';
import Modal from './Modal';
import { formatMoney } from '../utils/format';

const METHODS = ['Bank Transfer', 'Cash', 'Card', 'Cheque', 'Other'];
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * onSubmit(payload) must call the right endpoint (ap.applyPayment or
 * ar.applyPayment) and throw on failure — this component only handles
 * the form state, validation-by-the-server, and closing itself once
 * the caller's promise resolves.
 */
export default function PaymentModal({ title, balance, currency, onSubmit, onClose }) {
  const [amount, setAmount] = useState(balance != null ? String(balance) : '');
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(todayIso());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ amount: Number(amount), method, reference: reference || undefined, paidAt });
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="pay-amount">
            Amount{balance != null ? ` — outstanding ${formatMoney(balance, currency)}` : ''}
          </label>
          <input
            id="pay-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={balance ?? undefined}
            required
            className="field-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="pay-method">Method</label>
            <select id="pay-method" className="field-input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="pay-date">Date</label>
            <input id="pay-date" type="date" className="field-input" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="pay-reference">Reference (optional)</label>
          <input
            id="pay-reference"
            className="field-input"
            placeholder="Transfer ref, cheque no…"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
