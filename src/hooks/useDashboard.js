import { bi } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** BI dashboard snapshot — AR/AP summary, cash on hand, lifetime net income. */
export function useDashboard() {
  return useApiRequest(() => bi.dashboard(), []);
}
