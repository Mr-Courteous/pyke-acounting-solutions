import { po } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** status: one of REQUISITION_STATUSES | undefined (all). */
export function useRequisitions({ status, projectId } = {}) {
  return useApiRequest(() => po.requisitions({ status, projectId }), [status, projectId]);
}

export function useRequisition(id) {
  return useApiRequest(() => po.getRequisition(id), [id]);
}

/** status: one of ORDER_STATUSES | undefined (all). */
export function usePurchaseOrderList({ status, contactId, projectId } = {}) {
  return useApiRequest(() => po.orders({ status, contactId, projectId }), [status, contactId, projectId]);
}

export function usePurchaseOrder(id) {
  return useApiRequest(() => po.getOrder(id), [id]);
}
