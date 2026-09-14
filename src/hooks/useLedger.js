import { gl } from '../api/client';
import { useApiRequest } from './useApiRequest';

export function useAccountBalances() {
  return useApiRequest(() => gl.accountBalances(), []);
}

export function useTrialBalance(asOf) {
  return useApiRequest(() => gl.trialBalance({ asOf }), [asOf]);
}

export function useJournalEntries(params = {}) {
  return useApiRequest(() => gl.entries(params), [params.sourceType, params.accountId, params.from, params.to]);
}
