const TOKEN_KEY = 'mbsbridge_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Thin fetch wrapper: attaches the bearer token, parses JSON, and
 * throws with the backend's own error message on a non-2xx response
 * (every route in this API replies with { error: '...' } on failure —
 * see authMiddleware.js / the *Routes.js files) so callers can just
 * catch and show err.message.
 */
async function request(path, { method = 'GET', body, params } = {}) {
  const token = getToken();
  const baseUrl = import.meta.env.VITE_API_PROXY_TARGET || window.location.origin;
  const url = new URL(path, baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

// ── Auth ────────────────────────────────────────────────────────────
export const auth = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  bootstrapAdmin: (email, password, name) =>
    request('/api/auth/bootstrap-admin', { method: 'POST', body: { email, password, name } }),
  me: () => request('/api/auth/me'),
  listUsers: () => request('/api/auth/users'),
  createUser: (payload) => request('/api/auth/users', { method: 'POST', body: payload }),
  setRole: (id, role) => request(`/api/auth/users/${id}/role`, { method: 'PATCH', body: { role } }),
  setActive: (id, active) => request(`/api/auth/users/${id}/active`, { method: 'PATCH', body: { active } }),
};

// ── Business Intelligence ──────────────────────────────────────────
export const bi = {
  dashboard: () => request('/api/bi/dashboard'),
  revenueByCustomer: (params) => request('/api/bi/revenue-by-customer', { params }),
  spendByVendor: (params) => request('/api/bi/spend-by-vendor', { params }),
  profitAndLoss: (params) => request('/api/bi/profit-and-loss', { params }),
};

// ── Invoices (the existing NRS pipeline) ───────────────────────────
export const invoices = {
  list: () => request('/api/invoices'),
  // Manual entry — runs the same map/validate/sign/IRN/QR/transmit
  // pipeline a real ingestion adapter would, see src/pipeline.js.
  createManual: (payload) => request('/api/upload/manual', { method: 'POST', body: payload }),
  // Re-runs the pipeline for a REJECTED / NRS_REJECTED / ERROR invoice.
  retry: (id) => request(`/api/invoices/${id}/retry`, { method: 'POST' }),
};

// ── QuickBooks integration ──────────────────────────────────────────
export const quickbooks = {
  status: () => request('/api/quickbooks/status'),
  // /connect is a redirect + cookie handshake, not a JSON call — the
  // caller should navigate to this URL directly (window.location.href),
  // not fetch() it.
  connectUrl: '/api/quickbooks/connect',
  disconnect: () => request('/api/quickbooks/disconnect', { method: 'POST' }),
  backfill: (from, to) => request('/api/quickbooks/backfill', { params: { from, to } }),
};

// ── Contacts ────────────────────────────────────────────────────────
export const contacts = {
  list: (params) => request('/api/contacts', { params }),
  get: (id) => request(`/api/contacts/${id}`),
  create: (payload) => request('/api/contacts', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/api/contacts/${id}`, { method: 'PATCH', body: payload }),
};

// ── Accounts Receivable ────────────────────────────────────────────
export const ar = {
  list: (params) => request('/api/ar/receivables', { params }),
  get: (id) => request(`/api/ar/receivables/${id}`),
  summary: () => request('/api/ar/summary'),
  applyPayment: (id, payload) => request(`/api/ar/receivables/${id}/payments`, { method: 'POST', body: payload }),
  assignProject: (id, projectId) =>
    request(`/api/ar/receivables/${id}/project`, { method: 'PATCH', body: { projectId } }),
};

// ── Accounts Payable ────────────────────────────────────────────────
export const ap = {
  list: (params) => request('/api/ap/bills', { params }),
  get: (id) => request(`/api/ap/bills/${id}`),
  summary: () => request('/api/ap/summary'),
  create: (payload) => request('/api/ap/bills', { method: 'POST', body: payload }),
  applyPayment: (id, payload) => request(`/api/ap/bills/${id}/payments`, { method: 'POST', body: payload }),
  assignProject: (id, projectId) => request(`/api/ap/bills/${id}/project`, { method: 'PATCH', body: { projectId } }),
};

// ── General Ledger ──────────────────────────────────────────────────
export const gl = {
  accountBalances: () => request('/api/gl/accounts'),
  entries: (params) => request('/api/gl/entries', { params }),
  createEntry: (payload) => request('/api/gl/entries', { method: 'POST', body: payload }),
  reverseEntry: (id, payload) => request(`/api/gl/entries/${id}/reverse`, { method: 'POST', body: payload }),
  trialBalance: (params) => request('/api/gl/trial-balance', { params }),
};

// ── Bank Services ───────────────────────────────────────────────────
export const bank = {
  accounts: () => request('/api/bank/accounts'),
  transactions: (params) => request('/api/bank/transactions', { params }),
  reconciliationSummary: (bankAccountId) => request('/api/bank/reconciliation', { params: { bankAccountId } }),
  candidates: (transactionId) => request(`/api/bank/transactions/${transactionId}/candidates`),
  match: (transactionId, journalLineId) =>
    request(`/api/bank/transactions/${transactionId}/match`, { method: 'POST', body: { journalLineId } }),
  unmatch: (transactionId) => request(`/api/bank/transactions/${transactionId}/unmatch`, { method: 'POST' }),
  ignore: (transactionId) => request(`/api/bank/transactions/${transactionId}/ignore`, { method: 'POST' }),
  autoMatch: (bankAccountId) => request('/api/bank/match/auto', { method: 'POST', body: { bankAccountId } }),
};

// ── Project & Job Costing ──────────────────────────────────────────
export const projects = {
  list: (params) => request('/api/projects', { params }),
  get: (id) => request(`/api/projects/${id}`),
  create: (payload) => request('/api/projects', { method: 'POST', body: payload }),
  profitability: (id) => request(`/api/projects/${id}/profitability`),
  createPhase: (projectId, payload) => request(`/api/projects/${projectId}/phases`, { method: 'POST', body: payload }),
  createCostEntry: (phaseId, payload) =>
    request(`/api/projects/phases/${phaseId}/cost-entries`, { method: 'POST', body: payload }),
};

// ── Inventory Control ────────────────────────────────────────────────
export const inventory = {
  items: (params) => request('/api/inventory/items', { params }),
  getItem: (id) => request(`/api/inventory/items/${id}`),
  createItem: (payload) => request('/api/inventory/items', { method: 'POST', body: payload }),
  updateItem: (id, payload) => request(`/api/inventory/items/${id}`, { method: 'PATCH', body: payload }),
  unitConversions: (itemId) => request(`/api/inventory/items/${itemId}/unit-conversions`),
  upsertUnitConversion: (itemId, payload) =>
    request(`/api/inventory/items/${itemId}/unit-conversions`, { method: 'POST', body: payload }),
  warehouses: (params) => request('/api/inventory/warehouses', { params }),
  getWarehouse: (id) => request(`/api/inventory/warehouses/${id}`),
  createWarehouse: (payload) => request('/api/inventory/warehouses', { method: 'POST', body: payload }),
  updateWarehouse: (id, payload) => request(`/api/inventory/warehouses/${id}`, { method: 'PATCH', body: payload }),
  stockLevels: (params) => request('/api/inventory/stock-levels', { params }),
  valuation: (params) => request('/api/inventory/valuation', { params }),
  adjustments: (params) => request('/api/inventory/adjustments', { params }),
  postAdjustment: (payload) => request('/api/inventory/adjustments', { method: 'POST', body: payload }),
  postTransfer: (payload) => request('/api/inventory/transfers', { method: 'POST', body: payload }),
};

// ── Order Entry (sales) ──────────────────────────────────────────────
export const oe = {
  quotes: (params) => request('/api/oe/quotes', { params }),
  getQuote: (id) => request(`/api/oe/quotes/${id}`),
  createQuote: (payload) => request('/api/oe/quotes', { method: 'POST', body: payload }),
  setQuoteStatus: (id, status) => request(`/api/oe/quotes/${id}/status`, { method: 'PATCH', body: { status } }),
  convertQuote: (id, payload) => request(`/api/oe/quotes/${id}/convert`, { method: 'POST', body: payload }),
  orders: (params) => request('/api/oe/orders', { params }),
  getOrder: (id) => request(`/api/oe/orders/${id}`),
  createOrder: (payload) => request('/api/oe/orders', { method: 'POST', body: payload }),
  confirmOrder: (id) => request(`/api/oe/orders/${id}/confirm`, { method: 'POST' }),
  cancelOrder: (id) => request(`/api/oe/orders/${id}/cancel`, { method: 'POST' }),
  postShipment: (payload) => request('/api/oe/shipments', { method: 'POST', body: payload }),
};

// ── Purchase Orders (purchasing) ─────────────────────────────────────
export const po = {
  requisitions: (params) => request('/api/po/requisitions', { params }),
  getRequisition: (id) => request(`/api/po/requisitions/${id}`),
  createRequisition: (payload) => request('/api/po/requisitions', { method: 'POST', body: payload }),
  setRequisitionStatus: (id, status) =>
    request(`/api/po/requisitions/${id}/status`, { method: 'PATCH', body: { status } }),
  convertRequisition: (id, payload) => request(`/api/po/requisitions/${id}/convert`, { method: 'POST', body: payload }),
  orders: (params) => request('/api/po/orders', { params }),
  getOrder: (id) => request(`/api/po/orders/${id}`),
  createOrder: (payload) => request('/api/po/orders', { method: 'POST', body: payload }),
  approveOrder: (id) => request(`/api/po/orders/${id}/approve`, { method: 'POST' }),
  cancelOrder: (id) => request(`/api/po/orders/${id}/cancel`, { method: 'POST' }),
  closeOrder: (id) => request(`/api/po/orders/${id}/close`, { method: 'POST' }),
  matchInvoice: (id, payload) => request(`/api/po/orders/${id}/match-invoice`, { method: 'POST', body: payload }),
  createBillAndMatch: (id, payload) => request(`/api/po/orders/${id}/bills`, { method: 'POST', body: payload }),
  postReceipt: (payload) => request('/api/po/receipts', { method: 'POST', body: payload }),
};
