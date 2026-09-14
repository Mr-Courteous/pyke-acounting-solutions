import { ar } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | undefined (all). overdue: true for only past-due balances. */
export function useReceivables({ status, overdue } = {}) {
  return useApiRequest(() => ar.list({ status, overdue }), [status, overdue]);
}

export function useReceivablesSummary() {
  return useApiRequest(() => ar.summary(), []);
}
