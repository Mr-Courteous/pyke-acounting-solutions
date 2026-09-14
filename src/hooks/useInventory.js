import { inventory } from '../api/client';
import { useApiRequest } from './useApiRequest';

export function useItems({ active } = {}) {
  return useApiRequest(() => inventory.items({ active }), [active]);
}

export function useWarehouses({ active } = {}) {
  return useApiRequest(() => inventory.warehouses({ active }), [active]);
}

/** itemId and/or warehouseId are optional filters. */
export function useStockLevels({ itemId, warehouseId } = {}) {
  return useApiRequest(() => inventory.stockLevels({ itemId, warehouseId }), [itemId, warehouseId]);
}

export function useValuation({ warehouseId } = {}) {
  return useApiRequest(() => inventory.valuation({ warehouseId }), [warehouseId]);
}

/** All filters optional: itemId, warehouseId, type, from, to. */
export function useAdjustments(params = {}) {
  return useApiRequest(
    () => inventory.adjustments(params),
    [params.itemId, params.warehouseId, params.type, params.from, params.to]
  );
}
