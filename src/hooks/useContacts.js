import { contacts } from '../api/client';
import { useApiRequest } from './useApiRequest';

/** type: 'CUSTOMER' | 'VENDOR' | undefined (both). */
export function useContacts({ type, active } = {}) {
  return useApiRequest(() => contacts.list({ type, active }), [type, active]);
}
