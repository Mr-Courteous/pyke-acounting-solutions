const STATUS_TONE = {
  // AR / AP
  OPEN: 'pending',
  PARTIALLY_PAID: 'pending',
  PAID: 'positive',
  VOID: 'neutral',
  // Bank
  UNMATCHED: 'pending',
  MATCHED: 'positive',
  IGNORED: 'neutral',
  // Projects
  PLANNING: 'neutral',
  ACTIVE: 'positive',
  ON_HOLD: 'pending',
  COMPLETED: 'positive',
  CANCELLED: 'negative',
  // Invoices (NRS pipeline)
  RECEIVED: 'neutral',
  MAPPED: 'neutral',
  VALIDATED: 'pending',
  SIGNED: 'pending',
  READY_TO_TRANSMIT: 'pending',
  CONFIRMED: 'positive',
  REJECTED: 'negative',
  NRS_REJECTED: 'negative',
  ERROR: 'negative',
  // Inventory & fulfillment — Sales Quotes / Orders, Requisitions,
  // Purchase Orders, and 3-way match verdicts (Inventory, Order
  // Entry, Purchase Orders modules)
  DRAFT: 'neutral',
  SENT: 'pending',
  ACCEPTED: 'positive',
  DECLINED: 'negative',
  EXPIRED: 'negative',
  CONVERTED: 'positive',
  APPROVED: 'positive',
  PARTIALLY_SHIPPED: 'pending',
  SHIPPED: 'positive',
  PARTIALLY_RECEIVED: 'pending',
  CLOSED: 'neutral',
  QUANTITY_VARIANCE: 'negative',
  PRICE_VARIANCE: 'negative',
  QUANTITY_AND_PRICE_VARIANCE: 'negative',
};

/** Pass a known status string and the right color follows automatically; override with `tone` if needed. */
export default function StatusChip({ status, tone }) {
  const resolvedTone = tone || STATUS_TONE[status] || 'neutral';
  return <span className={`chip chip-${resolvedTone}`}>{status.replace(/_/g, ' ')}</span>;
}
