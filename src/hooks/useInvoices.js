import { invoices } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** The existing NRS e-invoicing pipeline — RECEIVED through CONFIRMED. */
export function useInvoices() {
  return useApiRequest(() => invoices.list(), []);
}
