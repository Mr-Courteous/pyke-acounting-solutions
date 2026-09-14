import { bank } from '../api/client';
import { useApiRequest } from './useApiRequest';

export function useBankAccounts() {
  return useApiRequest(() => bank.accounts(), []);
}

export function useBankTransactions({ bankAccountId, status } = {}) {
  return useApiRequest(() => bank.transactions({ bankAccountId, status }), [bankAccountId, status]);
}
