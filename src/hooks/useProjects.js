import { projects } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | undefined (all). */
export function useProjects({ status } = {}) {
  return useApiRequest(() => projects.list({ status }), [status]);
}

export function useProject(id) {
  return useApiRequest(() => projects.get(id), [id]);
}

export function useProjectProfitability(id) {
  return useApiRequest(() => projects.profitability(id), [id]);
}
