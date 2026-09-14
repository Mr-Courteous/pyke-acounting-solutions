import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatusChip from '../components/StatusChip';
import Modal from '../components/Modal';
import { useRequisitions, usePurchaseOrder, usePurchaseOrderList } from '../hooks/usePurchaseOrders';
import { useContacts } from '../hooks/useContacts';
import { useProjects } from '../hooks/useProjects';
import { useItems, useWarehouses } from '../hooks/useInventory';
import { po } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const TABS = ['Requisitions', 'Orders'];
const REQ_STATUSES = [undefined, 'DRAFT', 'APPROVED', 'REJECTED', 'CONVERTED'];
const ORDER_STATUSES = [undefined, 'DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'];

export default function PurchaseOrders() {
  const [tab, setTab] = useState('Requisitions');

  return (
    <Layout title="Purchase Orders">
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

      {tab === 'Requisitions' && <RequisitionsTab />}
      {tab === 'Orders' && <OrdersTab />}
    </Layout>
  );
}

// ── Purchase requisitions ───────────────────────────────────────────

function RequisitionsTab() {
  const [status, setStatus] = useState(undefined);
  const { data: requisitions, loading, error, refetch } = useRequisitions({ status });
  const [showNew, setShowNew] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function setReqStatus(id, newStatus) {
    setBusyId(id);
    try {
      await po.setRequisitionStatus(id, newStatus);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function convert(id) {
    setBusyId(id);
    try {
      await po.convertRequisition(id, {});
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Purchase requisitions</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Requisition
        </button>
      </div>

      <div className="filter-tabs">
        {REQ_STATUSES.map((s) => (
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
        <div className="page-loading">Loading requisitions…</div>
      ) : (
        <DataTable
          rows={requisitions}
          emptyMessage="No requisitions in this status."
          columns={[
            { key: 'requisitionNumber', label: 'Requisition' },
            { key: 'requestedBy', label: 'Requested by', render: (r) => r.requestedBy || '—' },
            { key: 'project', label: 'Project', render: (r) => r.project?.name || '—' },
            { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
            {
              key: 'actions',
              label: '',
              align: 'right',
              render: (r) => {
                if (r.status === 'CONVERTED') return null;
                const disabled = busyId === r.id;
                return (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                    {r.status === 'DRAFT' && (
                      <>
                        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setReqStatus(r.id, 'APPROVED')}>
                          Approve
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => setReqStatus(r.id, 'REJECTED')}>
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => convert(r.id)}>
                        Convert to PO
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
        <NewRequisitionModal
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

function ReqLineItemsEditor({ lines, setLines }) {
  const { data: items } = useItems();

  function updateLine(idx, field) {
    return (e) => {
      const { value } = e.target;
      setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
  }
  function addLine() {
    setLines((rows) => [...rows, { itemId: '', description: '', quantity: '', estimatedCost: '' }]);
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
            <input className="field-input" required placeholder="Description" value={line.description} onChange={updateLine(idx, 'description')} />
            <input className="field-input" type="number" step="0.01" min="0.01" required placeholder="Qty" value={line.quantity} onChange={updateLine(idx, 'quantity')} />
            <input className="field-input" type="number" step="0.01" min="0" placeholder="Est. cost" value={line.estimatedCost} onChange={updateLine(idx, 'estimatedCost')} />
            <button type="button" className="line-item-remove" onClick={() => removeLine(idx)} disabled={lines.length === 1} aria-label="Remove line">✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--space-2)' }} onClick={addLine}>
        + Add line
      </button>
    </div>
  );
}

function NewRequisitionModal({ onClose, onCreated }) {
  const { data: projects } = useProjects();
  const [requestedBy, setRequestedBy] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ itemId: '', description: '', quantity: '', estimatedCost: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await po.createRequisition({
        requestedBy: requestedBy || undefined,
        projectId: projectId || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description,
          quantity: Number(l.quantity),
          estimatedCost: l.estimatedCost ? Number(l.estimatedCost) : undefined,
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Purchase Requisition" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="req-by">Requested by (optional)</label>
            <input id="req-by" className="field-input" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="req-project">Project (optional)</label>
            <select id="req-project" className="field-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— None —</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <ReqLineItemsEditor lines={lines} setLines={setLines} />

        <div>
          <label className="field-label" htmlFor="req-notes">Notes (optional)</label>
          <input id="req-notes" className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create requisition'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Purchase orders ─────────────────────────────────────────────────

function OrdersTab() {
  const [status, setStatus] = useState(undefined);
  const { data: orders, loading, error, refetch } = usePurchaseOrderList({ status });
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Purchase orders</h2>
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
            { key: 'contact', label: 'Vendor', render: (o) => o.contact?.name || '—' },
            { key: 'orderDate', label: 'Date', render: (o) => formatDate(o.orderDate) },
            { key: 'expectedDate', label: 'Expected', render: (o) => formatDate(o.expectedDate) },
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
          onChanged={() => refetch()}
        />
      )}
    </div>
  );
}

function NewOrderModal({ onClose, onCreated }) {
  const { data: contacts } = useContacts({ type: 'VENDOR' });
  const { data: projects } = useProjects();
  const [contactId, setContactId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ itemId: '', description: '', quantity: '', cost: '' }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data: items } = useItems();

  function updateLine(idx, field) {
    return (e) => {
      const { value } = e.target;
      setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
  }
  function addLine() {
    setLines((rows) => [...rows, { itemId: '', description: '', quantity: '', cost: '' }]);
  }
  function removeLine(idx) {
    setLines((rows) => rows.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await po.createOrder({
        contactId: contactId || undefined,
        projectId: projectId || undefined,
        currency,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description,
          quantity: Number(l.quantity),
          unitCost: Number(l.cost),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Purchase Order" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="po-vendor">Vendor (optional)</label>
            <select id="po-vendor" className="field-input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">— None —</option>
              {(contacts || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="po-project">Project (optional)</label>
            <select id="po-project" className="field-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— None —</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="po-currency">Currency</label>
            <input id="po-currency" className="field-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="po-expected">Expected date (optional)</label>
            <input id="po-expected" type="date" className="field-input" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
        </div>

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
                <input className="field-input" required placeholder="Description" value={line.description} onChange={updateLine(idx, 'description')} />
                <input className="field-input" type="number" step="0.01" min="0.01" required placeholder="Qty" value={line.quantity} onChange={updateLine(idx, 'quantity')} />
                <input className="field-input" type="number" step="0.01" min="0" required placeholder="Unit cost" value={line.cost} onChange={updateLine(idx, 'cost')} />
                <button type="button" className="line-item-remove" onClick={() => removeLine(idx)} disabled={lines.length === 1} aria-label="Remove line">✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--space-2)' }} onClick={addLine}>
            + Add line
          </button>
        </div>

        <div>
          <label className="field-label" htmlFor="po-notes">Notes (optional)</label>
          <input id="po-notes" className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
  const { data: order, loading, error, refetch } = usePurchaseOrder(id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showReceive, setShowReceive] = useState(false);
  const [showMatch, setShowMatch] = useState(false);

  async function runAction(fn) {
    setBusy(true);
    setActionError('');
    try {
      await fn();
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
            {order.contact?.name || 'No vendor'} · <StatusChip status={order.status} /> · {formatDate(order.orderDate)}
          </p>

          <DataTable
            rows={order.lines}
            emptyMessage="No lines."
            columns={[
              { key: 'description', label: 'Description' },
              { key: 'quantity', label: 'Qty', align: 'right' },
              { key: 'unitCost', label: 'Unit cost', align: 'right', render: (l) => formatMoney(l.unitCost, order.currency) },
              { key: 'quantityReceived', label: 'Received', align: 'right' },
              { key: 'quantityOutstanding', label: 'Outstanding', align: 'right' },
            ]}
          />

          {order.receipts?.length > 0 && (
            <>
              <label className="field-label" style={{ marginTop: 'var(--space-4)' }}>Goods receipts</label>
              <DataTable
                rows={order.receipts}
                columns={[
                  { key: 'receiptNumber', label: 'Receipt' },
                  { key: 'receivedDate', label: 'Date', render: (r) => formatDate(r.receivedDate) },
                  { key: 'lines', label: 'Lines', render: (r) => r.lines.length },
                ]}
              />
            </>
          )}

          {order.bills?.length > 0 && (
            <>
              <label className="field-label" style={{ marginTop: 'var(--space-4)' }}>Bills</label>
              <DataTable
                rows={order.bills}
                columns={[
                  { key: 'billNumber', label: 'Bill' },
                  { key: 'amount', label: 'Amount', align: 'right', render: (b) => formatMoney(b.amount, b.currency) },
                  { key: 'status', label: 'Status', render: (b) => <StatusChip status={b.status} /> },
                ]}
              />
            </>
          )}

          <div className="modal-form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {order.status === 'DRAFT' && (
              <>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => runAction(() => po.cancelOrder(id))}>
                  Cancel order
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => runAction(() => po.approveOrder(id))}>
                  Approve order
                </button>
              </>
            )}
            {(order.status === 'APPROVED' || order.status === 'PARTIALLY_RECEIVED') && (
              <>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => runAction(() => po.closeOrder(id))}>
                  Close order
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setShowReceive(true)}>
                  Receive
                </button>
              </>
            )}
            {order.bills?.length > 0 && (
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setShowMatch(true)}>
                3-way match
              </button>
            )}
          </div>
        </>
      )}

      {showReceive && order && (
        <ReceiveModal
          order={order}
          onClose={() => setShowReceive(false)}
          onReceived={() => {
            setShowReceive(false);
            refetch();
            onChanged();
          }}
        />
      )}

      {showMatch && order && (
        <MatchModal order={order} onClose={() => setShowMatch(false)} />
      )}
    </Modal>
  );
}

function ReceiveModal({ order, onClose, onReceived }) {
  const { data: warehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const outstanding = order.lines.filter((l) => l.quantityOutstanding > 0.0001);
  const [quantities, setQuantities] = useState(
    Object.fromEntries(outstanding.map((l) => [l.id, String(l.quantityOutstanding)]))
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await po.postReceipt({
        orderId: order.id,
        warehouseId,
        lines: outstanding
          .map((l) => ({ orderLineId: l.id, quantity: Number(quantities[l.id]) || 0 }))
          .filter((l) => l.quantity > 0),
      });
      onReceived();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Receive — ${order.orderNumber}`} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="grn-warehouse">Warehouse</label>
          <select id="grn-warehouse" required className="field-input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Select warehouse…</option>
            {(warehouses || []).map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>

        <label className="field-label">Quantities to receive</label>
        {outstanding.map((l) => (
          <div key={l.id} className="modal-form-row">
            <div style={{ display: 'flex', alignItems: 'center' }}>{l.description}</div>
            <input
              type="number"
              step="0.01"
              min="0"
              max={l.quantityOutstanding}
              className="field-input"
              value={quantities[l.id]}
              onChange={(e) => setQuantities((q) => ({ ...q, [l.id]: e.target.value }))}
            />
          </div>
        ))}

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Receiving…' : 'Post receipt'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MatchModal({ order, onClose }) {
  const [billId, setBillId] = useState(order.bills?.[0]?.id || '');
  const [tolerancePct, setTolerancePct] = useState('2');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setReport(null);
    try {
      const result = await po.matchInvoice(order.id, {
        billId,
        tolerancePct: tolerancePct ? Number(tolerancePct) / 100 : undefined,
      });
      setReport(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`3-way match — ${order.orderNumber}`} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="match-bill">Bill</label>
            <select id="match-bill" required className="field-input" value={billId} onChange={(e) => setBillId(e.target.value)}>
              <option value="">Select bill…</option>
              {(order.bills || []).map((b) => (
                <option key={b.id} value={b.id}>{b.billNumber} — {formatMoney(b.amount, b.currency)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="match-tolerance">Tolerance %</label>
            <input id="match-tolerance" type="number" step="0.1" min="0" className="field-input" value={tolerancePct} onChange={(e) => setTolerancePct(e.target.value)} />
          </div>
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Matching…' : 'Run match'}
          </button>
        </div>
      </form>

      {report && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <StatusChip status={report.matchStatus} />
          <DataTable
            rows={[
              { label: 'Quantity', ordered: report.quantity.ordered, received: report.quantity.received, invoiced: '—' },
              { label: 'Value', ordered: formatMoney(report.value.ordered), received: formatMoney(report.value.received), invoiced: formatMoney(report.value.invoiced) },
            ]}
            columns={[
              { key: 'label', label: '' },
              { key: 'ordered', label: 'Ordered', align: 'right' },
              { key: 'received', label: 'Received', align: 'right' },
              { key: 'invoiced', label: 'Invoiced', align: 'right' },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
