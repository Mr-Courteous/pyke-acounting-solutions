import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusChip from '../components/StatusChip';
import Modal from '../components/Modal';
import { useQuotes, useSalesOrder, useSalesOrders } from '../hooks/useOrderEntry';
import { useContacts } from '../hooks/useContacts';
import { useItems, useWarehouses } from '../hooks/useInventory';
import { oe } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const TABS = ['Quotes', 'Orders'];
const QUOTE_STATUSES = [undefined, 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED'];
const ORDER_STATUSES = [undefined, 'DRAFT', 'CONFIRMED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'CANCELLED'];

export default function OrderEntry() {
  const [tab, setTab] = useState('Quotes');

  return (
    <Layout title="Order Entry">
      <div className="filter-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`filter-tab${tab === t ? ' filter-tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Quotes' && <QuotesTab />}
      {tab === 'Orders' && <OrdersTab />}
    </Layout>
  );
}

// ── Quotes ──────────────────────────────────────────────────────────

function QuotesTab() {
  const [status, setStatus] = useState(undefined);
  const { data: quotes, loading, error, refetch } = useQuotes({ status });
  const [showNew, setShowNew] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function setQuoteStatus(id, newStatus) {
    setBusyId(id);
    try {
      await oe.setQuoteStatus(id, newStatus);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function convert(id) {
    setBusyId(id);
    try {
      await oe.convertQuote(id, {});
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Sales quotes</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Quote
        </button>
      </div>

      <div className="filter-tabs">
        {QUOTE_STATUSES.map((s) => (
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
        <div className="page-loading">Loading quotes…</div>
      ) : (
        <DataTable
          rows={quotes}
          emptyMessage="No quotes in this status."
          columns={[
            { key: 'quoteNumber', label: 'Quote' },
            { key: 'contact', label: 'Customer', render: (q) => q.contact?.name || '—' },
            { key: 'issueDate', label: 'Issued', render: (q) => formatDate(q.issueDate) },
            { key: 'expiryDate', label: 'Expires', render: (q) => formatDate(q.expiryDate) },
            { key: 'status', label: 'Status', render: (q) => <StatusChip status={q.status} /> },
            {
              key: 'actions',
              label: '',
              align: 'right',
              render: (q) => {
                if (q.status === 'CONVERTED') return null;
                const disabled = busyId === q.id;
                return (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    {q.status === 'DRAFT' && (
                      <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setQuoteStatus(q.id, 'SENT')}>
                        Mark sent
                      </button>
                    )}
                    {q.status === 'SENT' && (
                      <>
                        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setQuoteStatus(q.id, 'ACCEPTED')}>
                          Accept
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setQuoteStatus(q.id, 'DECLINED')}>
                          Decline
                        </button>
                      </>
                    )}
                    {q.status === 'ACCEPTED' && (
                      <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => convert(q.id)}>
                        Convert to order
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      )}

      {showNew && (
        <NewQuoteModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function LineItemsEditor({ lines, setLines, priceLabel }) {
  const { data: items } = useItems();

  function updateLine(idx, field) {
    return (e) => {
      const { value } = e.target;
      setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
  }
  function addLine() {
    setLines((rows) => [...rows, { itemId: '', description: '', quantity: '', price: '' }]);
  }
  function removeLine(idx) {
    setLines((rows) => rows.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="field-label">Lines</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {lines.map((line, idx) => (
          <div key={idx} className="line-item-row" style={{ gridTemplateColumns: '1.2fr 1.5fr 0.7fr 0.8fr auto' }}>
            <select
              className="field-input"
              value={line.itemId}
              onChange={(e) => {
                const item = (items || []).find((i) => i.id === e.target.value);
                setLines((rows) =>
                  rows.map((r, i) =>
                    i === idx ? { ...r, itemId: e.target.value, description: item ? item.name : r.description } : r
                  )
                );
              }}
            >
              <option value="">No item (free text)</option>
              {(items || []).map((i) => (
                <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
              ))}
            </select>
            <input
              className="field-input"
              required
              placeholder="Description"
              value={line.description}
              onChange={updateLine(idx, 'description')}
            />
            <input
              className="field-input"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Qty"
              value={line.quantity}
              onChange={updateLine(idx, 'quantity')}
            />
            <input
              className="field-input"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder={priceLabel}
              value={line.price}
              onChange={updateLine(idx, 'price')}
            />
            <button
              type="button"
              className="line-item-remove"
              onClick={() => removeLine(idx)}
              disabled={lines.length === 1}
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
  );
}

function NewQuoteModal({ onClose, onCreated }) {
  const { data: contacts } = useContacts({ type: 'CUSTOMER' });
  const [contactId, setContactId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ itemId: '', description: '', quantity: '', price: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await oe.createQuote({
        contactId: contactId || undefined,
        currency,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.price),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Quote" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="quote-contact">Customer (optional)</label>
            <select id="quote-contact" className="field-input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">— None —</option>
              {(contacts || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="quote-currency">Currency</label>
            <input id="quote-currency" className="field-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="quote-expiry">Expiry date (optional)</label>
          <input id="quote-expiry" type="date" className="field-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>

        <LineItemsEditor lines={lines} setLines={setLines} priceLabel="Unit price" />

        <div>
          <label className="field-label" htmlFor="quote-notes">Notes (optional)</label>
          <input id="quote-notes" className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create quote'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sales orders ────────────────────────────────────────────────────

function OrdersTab() {
  const [status, setStatus] = useState(undefined);
  const { data: orders, loading, error, refetch } = useSalesOrders({ status });
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Sales orders</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Order
        </button>
      </div>

      <div className="filter-tabs">
        {ORDER_STATUSES.map((s) => (
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
        <div className="page-loading">Loading orders…</div>
      ) : (
        <DataTable
          rows={orders}
          emptyMessage="No orders in this status."
          onRowClick={(o) => setSelectedId(o.id)}
          columns={[
            { key: 'orderNumber', label: 'Order' },
            { key: 'contact', label: 'Customer', render: (o) => o.contact?.name || '—' },
            { key: 'orderDate', label: 'Date', render: (o) => formatDate(o.orderDate) },
            { key: 'status', label: 'Status', render: (o) => <StatusChip status={o.status} /> },
          ]}
        />
      )}

      {showNew && (
        <NewOrderModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            refetch();
          }}
        />
      )}

      {selectedId && (
        <OrderDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

function NewOrderModal({ onClose, onCreated }) {
  const { data: contacts } = useContacts({ type: 'CUSTOMER' });
  const [contactId, setContactId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [requestedShipDate, setRequestedShipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ itemId: '', description: '', quantity: '', price: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await oe.createOrder({
        contactId: contactId || undefined,
        currency,
        requestedShipDate: requestedShipDate || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.price),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Sales Order" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="order-contact">Customer (optional)</label>
            <select id="order-contact" className="field-input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">— None —</option>
              {(contacts || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="order-currency">Currency</label>
            <input id="order-currency" className="field-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="order-ship-date">Requested ship date (optional)</label>
          <input id="order-ship-date" type="date" className="field-input" value={requestedShipDate} onChange={(e) => setRequestedShipDate(e.target.value)} />
        </div>

        <LineItemsEditor lines={lines} setLines={setLines} priceLabel="Unit price" />

        <div>
          <label className="field-label" htmlFor="order-notes">Notes (optional)</label>
          <input id="order-notes" className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OrderDetail({ id, onClose, onChanged }) {
  const { data: order, loading, error, refetch } = useSalesOrder(id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showShip, setShowShip] = useState(false);

  async function confirm() {
    setBusy(true);
    setActionError('');
    try {
      await oe.confirmOrder(id);
      refetch();
      onChanged();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setActionError('');
    try {
      await oe.cancelOrder(id);
      refetch();
      onChanged();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={order ? order.orderNumber : 'Order'} onClose={onClose}>
      {loading && <div className="page-loading">Loading order…</div>}
      {error && <div className="error-banner">{error}</div>}
      {actionError && <div className="error-banner">{actionError}</div>}

      {order && (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-soft)', marginTop: 0 }}>
            {order.contact?.name || 'No customer'} · <StatusChip status={order.status} /> · {formatDate(order.orderDate)}
          </p>

          <DataTable
            rows={order.lines}
            emptyMessage="No lines."
            columns={[
              { key: 'description', label: 'Description' },
              { key: 'quantity', label: 'Qty', align: 'right' },
              { key: 'unitPrice', label: 'Price', align: 'right', render: (l) => formatMoney(l.unitPrice, order.currency) },
              { key: 'quantityShipped', label: 'Shipped', align: 'right' },
              { key: 'quantityBackordered', label: 'Backordered', align: 'right' },
            ]}
          />

          {order.shipments?.length > 0 && (
            <>
              <label className="field-label" style={{ marginTop: 'var(--space-4)' }}>Shipments</label>
              <DataTable
                rows={order.shipments}
                columns={[
                  { key: 'shipmentNumber', label: 'Shipment' },
                  { key: 'shippedDate', label: 'Date', render: (s) => formatDate(s.shippedDate) },
                  { key: 'lines', label: 'Lines', render: (s) => s.lines.length },
                ]}
              />
            </>
          )}

          <div className="modal-form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {order.status === 'DRAFT' && (
              <>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={cancel}>Cancel order</button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>Confirm order</button>
              </>
            )}
            {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_SHIPPED') && (
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setShowShip(true)}>Ship</button>
            )}
          </div>
        </>
      )}

      {showShip && order && (
        <ShipModal
          order={order}
          onClose={() => setShowShip(false)}
          onShipped={() => {
            setShowShip(false);
            refetch();
            onChanged();
          }}
        />
      )}
    </Modal>
  );
}

function ShipModal({ order, onClose, onShipped }) {
  const { data: warehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const shippable = order.lines.filter((l) => l.quantity - l.quantityShipped > 0.0001);
  const [quantities, setQuantities] = useState(
    Object.fromEntries(shippable.map((l) => [l.id, String(l.quantity - l.quantityShipped)]))
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await oe.postShipment({
        orderId: order.id,
        warehouseId,
        lines: shippable
          .map((l) => ({ orderLineId: l.id, quantity: Number(quantities[l.id]) || 0 }))
          .filter((l) => l.quantity > 0),
      });
      onShipped();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Ship — ${order.orderNumber}`} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="ship-warehouse">Warehouse</label>
          <select id="ship-warehouse" required className="field-input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Select warehouse…</option>
            {(warehouses || []).map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>

        <label className="field-label">Quantities to ship</label>
        {shippable.map((l) => (
          <div key={l.id} className="modal-form-row">
            <div style={{ display: 'flex', alignItems: 'center' }}>{l.description}</div>
            <input
              type="number"
              step="0.01"
              min="0"
              max={l.quantity - l.quantityShipped}
              className="field-input"
              value={quantities[l.id]}
              onChange={(e) => setQuantities((q) => ({ ...q, [l.id]: e.target.value }))}
            />
          </div>
        ))}

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Shipping…' : 'Post shipment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
