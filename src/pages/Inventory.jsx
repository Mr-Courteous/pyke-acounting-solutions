import { useState } from 'react';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { useItems, useWarehouses, useStockLevels, useValuation, useAdjustments } from '../hooks/useInventory';
import { inventory } from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

const TABS = ['Items', 'Warehouses', 'Stock levels', 'Adjustments'];
const ADJUSTMENT_TYPES = ['ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'RECEIPT', 'SHIPMENT'];

export default function Inventory() {
  const [tab, setTab] = useState('Items');

  return (
    <Layout title="Inventory">
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

      {tab === 'Items' && <ItemsTab />}
      {tab === 'Warehouses' && <WarehousesTab />}
      {tab === 'Stock levels' && <StockLevelsTab />}
      {tab === 'Adjustments' && <AdjustmentsTab />}
    </Layout>
  );
}

// ── Items ───────────────────────────────────────────────────────────

function ItemsTab() {
  const { data: items, loading, error, refetch } = useItems();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Items</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Item
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="page-loading">Loading items…</div>
      ) : (
        <DataTable
          rows={items}
          emptyMessage="No items yet."
          columns={[
            { key: 'sku', label: 'SKU' },
            { key: 'name', label: 'Name' },
            { key: 'stockingUnit', label: 'Unit' },
            { key: 'costingMethod', label: 'Costing' },
            { key: 'active', label: 'Active', render: (i) => (i.active ? 'Yes' : 'No') },
          ]}
        />
      )}

      {showNew && (
        <NewItemModal
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

function NewItemModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ sku: '', name: '', description: '', stockingUnit: 'EACH' });
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
      await inventory.createItem({
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        stockingUnit: form.stockingUnit || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Item" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="item-sku">SKU</label>
            <input id="item-sku" required className="field-input" value={form.sku} onChange={update('sku')} />
          </div>
          <div>
            <label className="field-label" htmlFor="item-unit">Stocking unit</label>
            <input id="item-unit" className="field-input" value={form.stockingUnit} onChange={update('stockingUnit')} />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="item-name">Name</label>
          <input id="item-name" required className="field-input" value={form.name} onChange={update('name')} />
        </div>
        <div>
          <label className="field-label" htmlFor="item-description">Description (optional)</label>
          <input id="item-description" className="field-input" value={form.description} onChange={update('description')} />
        </div>
        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Warehouses ──────────────────────────────────────────────────────

function WarehousesTab() {
  const { data: warehouses, loading, error, refetch } = useWarehouses();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Warehouses</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New Warehouse
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="page-loading">Loading warehouses…</div>
      ) : (
        <DataTable
          rows={warehouses}
          emptyMessage="No warehouses yet."
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'address', label: 'Address', render: (w) => w.address || '—' },
            { key: 'active', label: 'Active', render: (w) => (w.active ? 'Yes' : 'No') },
          ]}
        />
      )}

      {showNew && (
        <NewWarehouseModal
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

function NewWarehouseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ code: '', name: '', address: '' });
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
      await inventory.createWarehouse({ code: form.code, name: form.name, address: form.address || undefined });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Warehouse" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="wh-code">Code</label>
            <input id="wh-code" required className="field-input" value={form.code} onChange={update('code')} />
          </div>
          <div>
            <label className="field-label" htmlFor="wh-name">Name</label>
            <input id="wh-name" required className="field-input" value={form.name} onChange={update('name')} />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="wh-address">Address (optional)</label>
          <input id="wh-address" className="field-input" value={form.address} onChange={update('address')} />
        </div>
        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create warehouse'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Stock levels & valuation ───────────────────────────────────────

function StockLevelsTab() {
  const { data: warehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const { data: levels, loading, error } = useStockLevels({ warehouseId: warehouseId || undefined });
  const { data: valuation } = useValuation({ warehouseId: warehouseId || undefined });

  return (
    <div>
      {valuation && (
        <div className="stat-grid">
          <StatCard label="Total inventory value" value={formatMoney(valuation.total)} />
        </div>
      )}

      <div className="page-section">
        <div className="page-section-header">
          <h2>Stock levels</h2>
          <select className="field-input" style={{ width: 'auto' }} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {(warehouses || []).map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="page-loading">Loading stock levels…</div>
        ) : (
          <DataTable
            rows={levels}
            emptyMessage="No stock recorded yet."
            columns={[
              { key: 'sku', label: 'SKU', render: (l) => l.item.sku },
              { key: 'name', label: 'Item', render: (l) => l.item.name },
              { key: 'warehouse', label: 'Warehouse', render: (l) => l.warehouse.code },
              { key: 'quantityOnHand', label: 'On hand', align: 'right', render: (l) => l.quantityOnHand },
              { key: 'averageCost', label: 'Avg cost', align: 'right', render: (l) => formatMoney(l.averageCost) },
              {
                key: 'value',
                label: 'Value',
                align: 'right',
                render: (l) => formatMoney(l.quantityOnHand * l.averageCost),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}

// ── Adjustment ledger ───────────────────────────────────────────────

function AdjustmentsTab() {
  const { data: adjustments, loading, error, refetch } = useAdjustments();
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2>Stock adjustments</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowTransfer(true)}>
            Transfer stock
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowAdjust(true)}>
            + New Adjustment
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="page-loading">Loading adjustments…</div>
      ) : (
        <DataTable
          rows={adjustments}
          emptyMessage="No stock movements yet."
          columns={[
            { key: 'date', label: 'Date', render: (a) => formatDate(a.date) },
            { key: 'item', label: 'Item', render: (a) => `${a.item.sku} — ${a.item.name}` },
            { key: 'warehouse', label: 'Warehouse', render: (a) => a.warehouse.code },
            { key: 'type', label: 'Type', render: (a) => a.type.replace(/_/g, ' ') },
            { key: 'quantity', label: 'Quantity', align: 'right' },
            { key: 'unitCost', label: 'Unit cost', align: 'right', render: (a) => formatMoney(a.unitCost) },
            { key: 'totalCost', label: 'Total', align: 'right', render: (a) => formatMoney(a.totalCost) },
            { key: 'reason', label: 'Reason', render: (a) => a.reason || '—' },
          ]}
        />
      )}

      {showAdjust && (
        <NewAdjustmentModal
          onClose={() => setShowAdjust(false)}
          onCreated={() => {
            setShowAdjust(false);
            refetch();
          }}
        />
      )}

      {showTransfer && (
        <TransferModal
          onClose={() => setShowTransfer(false)}
          onCreated={() => {
            setShowTransfer(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function NewAdjustmentModal({ onClose, onCreated }) {
  const { data: items } = useItems();
  const { data: warehouses } = useWarehouses();
  const [form, setForm] = useState({ itemId: '', warehouseId: '', quantity: '', unitCost: '', reason: '', type: 'ADJUSTMENT' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isIncoming = Number(form.quantity) > 0;

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await inventory.postAdjustment({
        itemId: form.itemId,
        warehouseId: form.warehouseId,
        type: form.type,
        quantity: Number(form.quantity),
        unitCost: isIncoming ? Number(form.unitCost) : undefined,
        reason: form.reason || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New Stock Adjustment" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="adj-item">Item</label>
            <select id="adj-item" required className="field-input" value={form.itemId} onChange={update('itemId')}>
              <option value="">Select item…</option>
              {(items || []).map((i) => (
                <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="adj-warehouse">Warehouse</label>
            <select id="adj-warehouse" required className="field-input" value={form.warehouseId} onChange={update('warehouseId')}>
              <option value="">Select warehouse…</option>
              {(warehouses || []).map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="adj-type">Type</label>
          <select id="adj-type" className="field-input" value={form.type} onChange={update('type')}>
            {ADJUSTMENT_TYPES.filter((t) => t === 'ADJUSTMENT' || t === 'RECEIPT' || t === 'SHIPMENT').map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="adj-quantity">
              Quantity (signed — negative to reduce stock)
            </label>
            <input id="adj-quantity" type="number" step="0.01" required className="field-input" value={form.quantity} onChange={update('quantity')} />
          </div>
          {isIncoming && (
            <div>
              <label className="field-label" htmlFor="adj-cost">Unit cost</label>
              <input id="adj-cost" type="number" step="0.01" min="0" required className="field-input" value={form.unitCost} onChange={update('unitCost')} />
            </div>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="adj-reason">Reason {form.type === 'ADJUSTMENT' ? '' : '(optional)'}</label>
          <input id="adj-reason" required={form.type === 'ADJUSTMENT'} className="field-input" value={form.reason} onChange={update('reason')} />
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransferModal({ onClose, onCreated }) {
  const { data: items } = useItems();
  const { data: warehouses } = useWarehouses();
  const [form, setForm] = useState({ itemId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', reason: '' });
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
      await inventory.postTransfer({
        itemId: form.itemId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        quantity: Number(form.quantity),
        reason: form.reason || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Transfer Stock" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form className="modal-form" onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="tr-item">Item</label>
          <select id="tr-item" required className="field-input" value={form.itemId} onChange={update('itemId')}>
            <option value="">Select item…</option>
            {(items || []).map((i) => (
              <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-form-row">
          <div>
            <label className="field-label" htmlFor="tr-from">From warehouse</label>
            <select id="tr-from" required className="field-input" value={form.fromWarehouseId} onChange={update('fromWarehouseId')}>
              <option value="">Select warehouse…</option>
              {(warehouses || []).map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="tr-to">To warehouse</label>
            <select id="tr-to" required className="field-input" value={form.toWarehouseId} onChange={update('toWarehouseId')}>
              <option value="">Select warehouse…</option>
              {(warehouses || []).map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="tr-quantity">Quantity</label>
          <input id="tr-quantity" type="number" step="0.01" min="0.01" required className="field-input" value={form.quantity} onChange={update('quantity')} />
        </div>

        <div>
          <label className="field-label" htmlFor="tr-reason">Reason (optional)</label>
          <input id="tr-reason" className="field-input" value={form.reason} onChange={update('reason')} />
        </div>

        <div className="modal-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Transferring…' : 'Transfer stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
