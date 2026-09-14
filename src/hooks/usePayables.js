import { ap } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | undefined (all). overdue: true for only past-due balances. */
export function usePayables({ status, overdue } = {}) {
  return useApiRequest(() => ap.list({ status, overdue }), [status, overdue]);
}

export function usePayablesSummary() {
  return useApiRequest(() => ap.summary(), []);
}
