import { oe } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** status: one of QUOTE_STATUSES | undefined (all). */
export function useQuotes({ status, contactId } = {}) {
  return useApiRequest(() => oe.quotes({ status, contactId }), [status, contactId]);
}

export function useQuote(id) {
  return useApiRequest(() => oe.getQuote(id), [id]);
}

/** status: one of ORDER_STATUSES | undefined (all). */
export function useSalesOrders({ status, contactId, projectId } = {}) {
  return useApiRequest(() => oe.orders({ status, contactId, projectId }), [status, contactId, projectId]);
}

export function useSalesOrder(id) {
  return useApiRequest(() => oe.getOrder(id), [id]);
}
